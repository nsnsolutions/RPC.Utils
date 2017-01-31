'use strict';

module.exports = function ServiceProxyConstructor(opts) {

    /*
     * Create a proxy object that can make calles to other services over the
     * seneca bus.
     *
     * Opts:
     *
     *  opts.seneca:
     *  A handle to the seneca object.
     *
     *  opts.service:
     *  The name of the service to connect to. (Not including '.Pub')
     *
     *  opts.methods:
     *  A map of methods to bind to this object. See below.
     *
     * Method Map:
     *  The method map defines the version and if the service route is private
     *  or not. This map Expects the following keys:
     *
     *  version:
     *  What version of the method to call.
     *
     *  private:
     *  boolean indicating if this method exists on the private interface of
     *  the service.
     *
     * Exampe:
     *
     *  var params = {
     *    seneca: mySenecaObject,
     *    service: helloService,
     *    methods: {
     *      greet: { version: 'v1, private: false },
     *      ping: { version: 'v1', private: true }
     *    }
     *  }
     *
     *  var helloService = new ServiceProxy(params);
     *
     *  helloService.greet({ name: 'world' }, (err, data) => console.log);
     *  helloService.ping((err, data) => console.log);
     */

    var seneca = opts.seneca,
        service = opts.service,
        self = {};

    init();

    return self;

    // ------------------------------------------------------------------------

    function init() {
        for(var p in opts.methods)
            if(opts.methods.hasOwnProperty(p))
                attachMethod(p, opts.methods[p]);
    }

    function attachMethod(name, desc) {

        var serviceName = desc.private === true ? service : `${service}.Pub`,
            pattern = `role:${serviceName},cmd:${name}.${desc.version}`;

        self[name] = (args, done) => {

            /* 
             * Allow for callback only call.
             */

            var _done, _args;

            if(typeof done === 'undefined') {
                _args = {};
                _done = args;
            } else {
                _args = args;
                _done = done;
            }

            rpcExec(pattern, _args, _done);
        }
    }

    function rpcExec(pattern, args, done) {

        seneca.act(pattern, args, (err, data) => {
            if(err)
                return done({
                    name: 'TransportError',
                    message: 'Unable to call remote service.',
                    innerError: err
                });

            else if(data.hasError)
                return done({
                    name: 'RemoteServiceError',
                    code: data.code,
                    message: data.message
                });

            done(null, data.result);
        });
    }
}
