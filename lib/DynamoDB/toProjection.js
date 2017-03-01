'use strict'

const _ = require('lodash');

module.exports = function toProjection(opts) {
    let ret;
    switch(opts.secondaryKeyMap.projection) {
        case "ALL":
            ret = opts.item;
            break;

        case "INCLUDE":
            ret = toIncludeProjection(opts);
            break;

        case "KEYS_ONLY":
            ret = toKeyProjection(opts);
            break;
    }
    return ret;
}

function toIncludeProjection(opts) {
    var ret = _.clone(opts.primaryKey),
        picks = _.values(opts.secondaryKeyMap.key),
        keys = _.pick(opts.item, picks),
        others = _.pick(opts.item, opts.secondaryKeyMap.projectionAttributes);

    return _.assign(ret, keys, others);
}

function toKeyProjection(opts) {
    var ret = _.clone(opts.primaryKey),
        picks = _.values(opts.secondaryKeyMap.key),
        keys = _.pick(opts.item, picks);

    return _.assign(ret, keys);
}
