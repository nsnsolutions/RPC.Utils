'use strict';

module.exports = function DummyCacheProvider(opts) {

    console.warn("Initializing Dummy Cache Provider.");

    var self = this;

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

    function get(key, cb) { callback_if(cb)(null, null); }
    function getAll(key, cb) { callback_if(cb)(null, null); }
    function setField(key, field, value, cb) { callback_if(cb)(null, null); }
    function expire(key, cb) { callback_if(cb)(null, null) }
    function set(key, value, cb) { callback_if(cb)(null, null); }
    function flush(key, cb) { callback_if(cb)(null, null) }
    function close(cb) { callback_if(cb)(null, null); }
    function multi() {
        var ret = new DummyCacheProvider();
        ret.exec = (cb) => callback_if(cb)(null, null);
        return ret;
    }

    function callback_if(cb) {
        if(!cb)
            return function(){}

        return function() { 
            var args = Array.prototype.slice.call(arguments);
            cb.apply(self, args);
        }
    }
}
