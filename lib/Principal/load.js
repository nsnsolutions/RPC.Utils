'use strict';

const ACCOUNT_SERVICE = "role:accountService.Pub,cmd:getAuthorityFromToken.v1";
const Person = require('./Person');

module.exports = function(opts, callback) { 

    var token = opts.token,
        transport = opts.transport,
        pattern = opts.pattern || ACCOUNT_SERVICE,
        logLevel = opts.logLevel;

    if(!token) 
        return callback({
            name: 'notAuthorized',
            message: 'No authority provided.' });

    else if(typeof token !== 'string')
        return callback({
            name: 'notAuthorized',
            message: 'No authority provided.' });

    var _token = token.split(' ');

    var params = {
        logLevel: logLevel,
        type: _token[0],
        token: _token[1]
    };

    transport.act(pattern, params, (err, result) => {
        if(err)
            return callback({
                name: "notAvailable",
                message: "Unable to verify credentials. Service is not available.",
                innerError: err
            });

        else if(result.hasError)
            return callback(result);

        callback(null, Person(result.result));
    });
}
