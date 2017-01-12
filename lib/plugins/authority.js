'use strict';

//const Logger = require('../Logger');
//const Executor = require('../Executor');
const Person = require('../Person');

module.exports = function AuthorityPlugin(opts) {
    var seneca = this;
    var logLevel = opts.logLevel;

    seneca.decorate('getAuthority', getAuthority);

    return { name: "vfsUtilsAuthorityPlugin" };

    // ------------------------------------------------------------------------

    function getAuthority(opts, cb) {

        var _header = opts.token.split(' ');

        var params = {
            logLevel: opts.logLevel || logLevel,
            type: _header[0],
            token: _header[1]
        };

        seneca.act("role:accountService.Pub,cmd:getAuthorityFromToken.v1", params, (err, result) => {
            if(err)
                return cb({
                    name: "forbidden",
                    message: "Unable to obtain authority.",
                    innerError: err
                });

            else if(result.hasError)
                return cb({
                    name: "forbidden",
                    message: "Authorization failed: " + result.message
                });

            return cb(null, new Person(result.result));
        });
    }
};

