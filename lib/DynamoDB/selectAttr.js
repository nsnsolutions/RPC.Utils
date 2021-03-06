'use strict';

const lodash = require('lodash');

module.exports = selectAttr;
selectAttr.each = selectAttr_each;

function selectAttr(item, attrs) {
    if(!attrs || attrs === '*')
        return item;

    return lodash.pick(item, attrs);
}

function selectAttr_each(items, attrs) {
    var ret = [];

    for(let item of items)
        ret.push(selectAttr(item, attrs));

    return ret;
}
