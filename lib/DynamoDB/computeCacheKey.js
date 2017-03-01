'use strict';

const _ = require('lodash');

module.exports = (table, index, key) => {
    return `RECORD:${table}:${index}[${_.sortBy(key).join(":")}]`;
}
