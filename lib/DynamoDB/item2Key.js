'use strict';

const _ = require('lodash');

module.exports = function item2Key(item, keyMap) {

    var key = { };

    if(!item)
        return null;

    if(_.has(item, keyMap.HASH))
        key[keyMap.HASH] = item[keyMap.HASH];

    else
        // Missing value in item: Key is not valid
        return null

    if(keyMap.RANGE && _.has(item, keyMap.RANGE))
        key[keyMap.RANGE] = item[keyMap.RANGE];

    else if(keyMap.RANGE)
        // Missing value in item: Key is not valid
        return null

    return key;
}
