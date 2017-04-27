'use strict'

const uuid = require('uuid');
const moment = require('moment');
const FORMAT_DATETIME = 'Y-MM-DDTHH:mm:ss.SSS[Z]';

module.exports = {
    fmtUuid: fmtUuid,
    fmtDate: fmtDate,
    fmtTimestamp: fmtTimestamp,
    toDate: toDate,
    toHex: toHex,
    computeRedisKey: require('./computeRedisKey')
};

function fmtUuid(uid) {
    var _uid = uid || uuid.v4();
    return _uid.replace(/\-/g, '');
}

function fmtDate(dt, fmt) {
    var _dt = dt && dt.toString().toUpperCase();
    var _fmt = fmt || FORMAT_DATETIME;
    return moment.utc(_dt).format(_fmt);
}

function fmtTimestamp(dt, fmt) {
    var _dt = dt && dt.toString().toUpperCase();
    var _fmt = fmt || FORMAT_DATETIME;
    return moment.utc(_dt).unix();
}

function toDate(dt, fmt) {
    var _dt = dt && dt.toString().toUpperCase();
    var _fmt = fmt || FORMAT_DATETIME;
    return moment.utc(_dt, fmt).toDate();
}

function toHex(v, pad) {
    var s = Number(v).toString(16);
    var p = (pad || 8) - s.length;
    var padding = "";

    while(0 < (p--))
        padding += "0"

    return padding + s.toUpperCase();
}
