'use strict';

const CacheServiceName = 'DynamoDB';
const computeRedisKey = require('../computeRedisKey');
const _ = require('lodash');

module.exports = {
    record: _record,
    table: _table
};

function _record(table, index, key) {

    /* 
     * Redis Key looks like:
     * DynamoDB:Record:Table=VFS_Jobs:Index=jobid-index:Key=VE20170101abc123
     */

    return computeRedisKey(CacheServiceName, 'Record', {
        Table: table,
        Index: index,
        Key: _.sortBy(key).join(",")
    });
}

function _table(table) {

    /*
     * Redis Key looks like:
     * DynamoDB:TableDescription:Table=VFS_Jobs
     */

    return computeRedisKey(CacheServiceName, 'TableDescription', {
        Table: table
    });
}
