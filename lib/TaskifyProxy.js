'use strict';

module.exports = function TaskifyProxy(opts) {

    var seneca = opts.seneca || this,
        pattern = opts.pattern,
        field = opts.field,
        gparams = typeof opts.params !== 'function'
            ? () => opts.params
            : opts.params;

    return handler;

    // ------------------------------------------------------------------------

    function handler(console, state, done) {

        var params = gparams(state);

        seneca.act(pattern, params, (e, r) => {

            if(e) return done(e);
            else if(r.hasError) return done(r);

            // debug is only present if we are using the rpcUtils logger.
            if(console.debug)
                console.debug(
                    "Result from pattern:", pattern,
                    "\n"+JSON.stringify(r, null, 2));

            // If we are not using the rpcUtils logger, we still want to print
            else
                console.info(
                    "Result from pattern:", pattern,
                    "\n"+JSON.stringify(r, null, 2));

            if(field)
                state.set(field, r.result);

            done(null, state);
        });
    }
}
