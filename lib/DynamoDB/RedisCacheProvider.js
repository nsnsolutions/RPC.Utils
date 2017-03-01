'use strict';

const Redis = require('redis');
const lodash = require('lodash');

module.exports = function RedisCacheProvider(opts) {

    var self = this,
        _opts = lodash.defaults(opts, { ttl: 8600, url: "redis://localhost:6379/0" }),
        redis = _opts.service ||  Redis.createClient({ url: _opts.url });

    if(!_opts.service)
        redis.on('error', (e) => console.error("ERROR", e) );

    self.get = get;
    self.set = set;
    self.getAll = getAll;
    self.setField = setField;
    self.expire = expire;
    self.multi = multi;
    self.flush = flush;
    self.close = close;

    return self;

    // ------------------------------------------------------------------------

    function get(key, cb) { 
        var _cb = callback_if(cb);
        redis.get(key, (err, data) => {

            let val;

            if(!err) {
                try { 
                    // incase of bad data in cache.
                    val = JSON.parse(data); 
                } catch(e) { 
                    // Flush bad data.
                    self.flush(key);
                    err = e; 
                }
            }

            // either val will be set or err will be set.
            _cb(err, val);
        });
    }

    function getAll(key, cb) {
        var _cb = callback_if(cb);
        redis.hgetall(key, (err, data) => {

            var val = [];

            if(!err) {
                for(let record in data) {
                    if(!data.hasOwnProperty(record))
                        continue;

                    try {
                        val.push(JSON.parse(data[record]));
                    } catch(e) {
                        self.flush(key);
                        val = null;
                        break;
                    }
                }
            }

            // either val will be set or err will be set.
            _cb(err, val.length === 0 ? null : val);
        });
    }

    function setField(key, field, value, cb) {
        var _cb = callback_if(cb);
        let _value;

        try { _value = JSON.stringify(value) }
        catch(e) { return _cb(e) }

        redis.hmset(key, field, _value, _cb);
    }

    function expire(key, cb) {
        redis.expire(key, _opts.ttl, callback_if(cb))
    }

    function set(key, value, cb) {
        var val = JSON.stringify(value);
        redis.setex(key, _opts.ttl, val, callback_if(cb));
    }

    function flush(key, cb) {
        redis.del(key, callback_if(cb));
    }

    function close(cb) {
        redis.quit(callback_if(cb));
    }

    function callback_if(cb) {
        if(!cb)
            return function(){}

        return function() { 
            var args = Array.prototype.slice.call(arguments);
            cb.apply(self, args);
        }
    }

    function multi() {
        var srv = redis.multi();
        var ret = new RedisCacheProvider({
            service: srv, 
            ttl: _opts.ttl 
        });

        ret.exec = (cb) => srv.exec(callback_if(cb));
        return ret;
    }
}
