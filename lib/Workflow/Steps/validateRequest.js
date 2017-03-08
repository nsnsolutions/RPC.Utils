'use strict';

module.exports = validateRequest;

function validateRequest(console, state, done) {

    /*
     * Verify the request matches the minimum sepcifications for access using
     * this.optional, this.required and this.authority
     */

    var required = this.required,
        optional = this.optional,
        authority = this.authority || false;

    if(authority && !authority(state.$principal))
        return done({});

    done(null, state);
}
