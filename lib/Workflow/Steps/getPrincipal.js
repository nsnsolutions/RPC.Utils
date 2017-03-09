'use strict';

const Principal = require('../../Principal');

module.exports = getPrincipal;

function getPrincipal(console, state, done) {

    /*
     * Retrieve the current principal user identified by token.
     * If no token is present, a guest principal is created, if the token is
     * not valid, a notAuthorized error is returned. Otherwise a representation
     * of the authorized user/service is returned.
     *
     * Expected On State (Optional):
     * state.token
     *
     * Places on State:
     * state.$principal
     */

    var seneca = this.transport,
        authorizer = this.authorizer || false,
        logLevel = this.logLevel;

    if(!state.token || !authorizer) {
        state.set('$principal', Principal.Person.guest);
        console.debug("PRINCIPAL:", state.$principal.toString());
        return done(null, state);
    }

    var params = {
        token: state.token,
        transport: seneca,
        logLevel: logLevel
    };

    Principal.load(params, (err, person) => {
        if(err)
            return done(err);

        state.set('$principal', person);
        console.debug("PRINCIPAL:", state.$principal.toString());
        done(null, state);
    });
}
