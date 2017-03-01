'use strict';

const jsonic = require('jsonic');
const _ = require('lodash');

module.exports = function computeRedisKey(serviceName, variableName, moreArgs) {

    var ret = `${serviceName}:${variableName}`;

    if(moreArgs) {
        var fields = [ret];

        for (let f of Array.prototype.slice.call(arguments).slice(2))
            fields.push(computeRedisFields(f));

        ret = fields.join(":");
    }

    return ret;

};

function computeRedisFields(fields) {
    var ret = [],
        obj = jsonic(fields);

    _.mapKeys(obj, (value, key) => {
        ret.push(`${key}=${value}`);
    });

    return ret.join(':');
}
