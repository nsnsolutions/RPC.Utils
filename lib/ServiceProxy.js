'use strict'

const lodash = require('lodash');

module.exports = function ServiceProxy(opts) {

    /* Create a proxy for the given service.
     *
     * Arguments:
     * - seneca:
     *     Optional - A reference to the seneca object. If this value is
     *     not provided, it MUST be provided at the point of RPC Execution.
     *
     * - logLevel:
     *     Optional - A global override value for logLevel on all outbound RPC
     *     calls. This seeds logLevel into the args list and must be supported
     *     by the remote service.
     *
     * - service:
     *     The Role registered name of the service without the .Pub.
     *
     * - methods:
     *     An array of method specifications. See below.
     *
     * Method Specifications.
     * - name:
     *     The name, cmd value, of the target service function without the
     *     version identifier.
     *
     * - version:
     *     Optional - The version identifier for the target service function.
     *     Default: v1
     *
     * - decorate:
     *     Optional - If provided, this will be the name the function is named
     *     on the object returned by this constructor.
     *
     * - private:
     *     Optional - A value indicating if this method is registered on the
     *     public or private exchange route key. A false value appens .Pub
     *     Defaut: false.
     *
     * Example opts object:
     *   {
     *     seneca: seneca,
     *     logLevel: 'default'
     *     service: "tokenService",
     *     methods: [
     *       {
     *         name: 'tokenize',
     *         version: 'v1',
     *         decorate: 'doTokenize',
     *         private: false
     *       }
     *     ]
     *   }
     */

    var self = {};

    init();

    return self;

    // ------------------------------------------------------------------------

    function init() {

        // Build an RPC Execution function for each method described.
        for(let m of opts.methods) 
            self[m.decorate || m.name] = makeFunction(opts.service, m);
    }

    function makeFunction(service, spec) {

        // Build the seneca pattern : 'role:ROLE.Pub,cmd:METH.v1'
        var role = spec.private ? service : `${service}.Pub`,
            cmd = `${spec.name}.${spec.version||'v1'}`;

        return function() {

            /*
             * arguments
             * - params - Optional: Override seneca and log level.
             * - args - The arguments to send to the remote service.
             * - callback - A callback handler that will be called on complete.
             */

            var _args = Array.prototype.slice.call(arguments),
                callback = _args.pop(),
                args = _args.pop(),
                params = _args.pop() || {};

            lodash.defaults(params, opts);

            if(params.logLevel)
                lodash.defaults(args, { logLevel: params.logLevel });

            params.seneca.act(`role:${role},cmd:${cmd}`, args, (err, resp) => {
                if(err)
                    return callback({
                        name: 'notAvailable',
                        message: 'Cannot access remote service.',
                        innerError: err
                    });

                else if(resp.hasError)
                    return callback(resp);

                else
                    return callback(null, resp.result);
            });
        };
    }
}
