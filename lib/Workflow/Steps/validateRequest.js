'use strict';

module.exports = validateRequest;

function validateRequest(console, state, done) {

    /*
     * Verify the request matches the minimum sepcifications for access using
     * this.optional, this.required and this.authorizer
     */

    var required = this.required || [],
        optional = this.optional || [],
        authorizer = this.authorizer || false;

    let regex, value;

    if(authorizer && !authorizer(state.$principal))
        return done({
            name: 'forbidden',
            message: 'Insufficient Privileges.' });

    for(let req of required) {

        regex = req.regex && new RegExp(req.regex);
        value = state.get(req.field);

        if (!state.has(req.field))
            return done({ name: "badRequest",
                message: `Missing required field '${req.field}'` });

        else if(req.type && !state.has(req.field, req.type))
            return done({ name: "badRequest",
                message: `Wrong type for field '${req.field}'. Expected ${typeof req.type()}` });

        else if(regex && !regex.test(value))
            return done({ name: "badRequest",
                message: `Incorrect input format for field '${req.field}'` });

        else if(req.maxLength && value.length > req.maxLength)
            return done({ name: "badRequest",
                message: `Value of input parameter is to large for field '${req.field}'` });

        else if(req.minLength && value.length < req.minLength)
            return done({ name: "badRequest",
                message: `Value of input parameter is to short for field '${req.field}'` });

        else if(req.customValidator && !req.customValidator.call(this, value, req))
            return done({ name: "badRequest",
                message: `Value of input parameter is not correct for field '${req.field}'` });
    }

    for(let req of optional) {

        if (state.has(req.field)) {

            regex = req.regex && new RegExp(req.regex);
            value = state.get(req.field);

            if (!state.has(req.field, req.type))
                return done({ name: "badRequest",
                    message: `Wrong type for optional field '${req.field}'. Expected ${typeof req.type()}` });

            else if(regex && !regex.test(value))
                return done({ name: "badRequest",
                    message: `Incorrect input format for field '${req.field}'` });

            else if(req.maxLength && value.length > req.maxLength)
                return done({ name: "badRequest",
                    message: `Value of input parameter is to large for field '${req.field}'` });

            else if(req.minLength && value.length < req.minLength)
                return done({ name: "badRequest",
                    message: `Value of input parameter is to short for field '${req.field}'` });

            else if(req.customValidator && !req.customValidator.call(this, value, req))
                return done({ name: "badRequest",
                    message: `Value of input parameter is not correct for field '${req.field}'` });

        } else if('default' in req) {
            state.ensureExists(req.field, req.default);
        }
    }

    done(null, state);
}
