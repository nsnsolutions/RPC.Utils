'use strict';

const AWS = require('aws-sdk');
const async = require('async');
const Log = require('./Logger');
const helpers = require('./helpers');

module.exports = CachedTable;

CachedTable.create = (opts, cb) => {

    /*
     * Create a CachedTable or map of CachedTable objects from the given 
     * tableName or tableMap respectivly using the provided Dynamo Client
     * connection.
     *
     * Arguments:
     *
     *   opts.dynamoClient:
     *     A reference to a connected AWS.DynamoDB object.
     *
     *   opts.redisClient:
     *     A reference to a connected redis.Client object.
     *
     *   opts.tableName:
     *     The name of the table for which to create the cache Object.
     *
     *   opts.tableMap:
     *     A map that identifes what tables to load. The map keys can be any
     *     think you would like. The value of each field in the map should be
     *     the name of the table for which to create the CachedTable object.
     *     Example: { t1: "Dynamo_TableName", t2: "Dynamo_TableName2" }
     *
     *   opts.ttl:
     *     Optional: The amount of time a cache item should live by default.
     *     Specify value in seconds.
     *     Default: 86000 (one day)
     *
     *   opts.logLevel:
     *     Optional: The named log level to use in the logger.
     *     Default: "DEFAULT"
     *
     *   cb:
     *     Callback to execute once complete.
     *
     *     If a single tableName is given, the data will contain an instance of
     *     CachedTable that represents that table.
     *
     *     If a tableMap is given, the data will contain a map of CachedTable
     *     instances that match the keys of the given tablemap.
     */

    if(opts.tableName)
        createFromName(opts, cb);

    else if(opts.tableMap)
        createFromMap(opts, cb);

    else
        cb({
            name: "ArgumentError",
            message: "No table specified."
        });
};

function CachedTable(opts) {

    /* An object that can be used to fetch and save records from DynamoDB using
     * a caching layer for performance and more efficient read consumption.
     *
     * Arguments:
     *
     *   opts.dynamoClient:
     *     A reference to a connected AWS.DynamoDB object.
     *   
     *   opts.redisClient:
     *     A reference to a connected redis.client object.
     *
     *   opts.ttl:
     *     Optional: The amount of time a cache item should live by default.
     *     Specify value in seconds.
     *     Default: 86000 (one day)
     *
     *   opts.logLevel:
     *     Optional: The named log level to use in the logger.
     *     Default: "DEFAULT"
     *
     *   opts.tableDesc:
     *     A DynamoDB Table Description as returned by
     *     AWS.DynamoDB.describeTable method.
     */

    var dynamoClient = new AWS.DynamoDB.DocumentClient({ service: opts.dynamoClient });
    var redisClient = opts.redisClient;
    var keyAttributes, tableName;
    var default_ttl = opts.ttl || 86000;
    var default_logLevel = opts.logLevel || "DEFAULT";

    init(opts.tableDesc);

    return {
        fetch: fetch,
        save: save,
        update: update,
        flush: flush,
        get tableName() { return tableName; },
        get indexes() { return keyAttributes; }
    }

    // ------------------------------------------------------------------------

    function init(td) {

        tableName = opts.tableDesc.TableName;
        keyAttributes = { PRIMARY: keySchema2KeyMap(td.KeySchema) };

        if(td.GlobalSecondaryIndexes) {
            for(var i = 0; i < td.GlobalSecondaryIndexes.length; i++) {
                var _gsi = td.GlobalSecondaryIndexes[i];
                keyAttributes[_gsi.IndexName] = keySchema2KeyMap(_gsi.KeySchema);
            }
        }

        if(td.LocalSecondaryIndexes) {
            for(var i = 0; i < td.LocalSecondaryIndexes.length; i++) {
                var _lsi = td.LocalSecondaryIndexes[i];
                keyAttributes[_lsi.IndexName] = keySchema2KeyMap(_lsi.KeySchema);
            }
        }
    }

    function keySchema2KeyMap(ks) {
        var ret = {};
        for(var i=0; i<ks.length; i++)
            ret[ks[i].KeyType] = ks[i].AttributeName;
        return ret;
    }

    function makeDynamoQueryParams(keys, index) {
        var _index = index || "PRIMARY";
        var eav = {}, ean = {}, kce = [];
        var kl = keyAttributes[_index];

        kce.push("#HASH = :HASH");
        ean["#HASH"] = kl.HASH;
        eav[":HASH"] = keys[kl.HASH];

        if(kl.RANGE && kl.RANGE in keys) {
            kce.push("#RANGE = :RANGE");
            ean["#RANGE"] = kl.RANGE;
            eav[":RANGE"] = keys[kl.RANGE];
        }

        var params = {
            TableName: tableName,
            KeyConditionExpression: kce.join(" AND "),
            ExpressionAttributeValues: eav,
            ExpressionAttributeNames: ean
        };

        if(_index !== "PRIMARY")
            params.IndexName = _index;

        return params;
    }

    function formatRedisKey(strKey, index) {
        if(!strKey)
            return null;
        else
            return `${tableName}:${index || "PRIMARY"}:${strKey}`;
    }

    function makeRedisKey(keys, index) {
        var kl = keyAttributes[index || "PRIMARY"];

        if(!keys)
            return null;

        else if(kl.HASH && kl.RANGE)
            return formatRedisKey(`${keys[kl.HASH]}:${keys[kl.RANGE]}`, index);

        else
            return formatRedisKey(keys[kl.HASH], index);
    }

    function fetch(opts, cb) {

        /* Retrieve a record.
         *
         * This method will attempt to retrieve the record from cache. If the
         * data is not found, it will go to the database for the record. If
         * found, the record will be returned and added to cache.
         *
         * Arguments:
         *  opts.key: An object containting the keys needed to located the record.
         *  opts.index: A string indicating the secondary index (if applicable).
         *  opts.ttl: The time, in seconds, the cache should live. Default: 86400
         *  opts.logLevel: The log log level used for this invocation.
         *  cb: A callback function containing the result of the fetch.
         */

        var ttl = opts.ttl || default_ttl;
        var console = new Log({ header: "DynamoCache:fetch", level: opts.logLevel || default_logLevel });

        var state = {
            cacheKey: makeRedisKey(opts.key, opts.index),
            secondaryIndex: (opts.index || "PRIMARY") !== "PRIMARY",
            cacheMiss: false,
            updateCache: false,
            record: null
        };

        var tasks = [
            _fCache,
            _fFetch,
            _fWCache
        ];

        if(state.secondaryIndex)
            tasks.unshift(_fCache);

        async.waterfall(tasks, (err) => {

            if(err)
                return cb({
                    name: "CachedTableError",
                    message: "Unable to retrieve record.",
                    innerError: err
                });

            cb(null, wrapTableItem(state.record));
        });

        // --------------------------------------------------------------------

        function _fCache(done) {

            if(state.cacheMiss)
                return done();

            console.debug("Attempting to pull record from cache: " + state.cacheKey);

            redisClient.get(state.cacheKey, (err, rec) => {

                if(err) {
                    return done({
                        name: "RedisError",
                        message: "Failed to fetch data from cache.",
                        innerError: err
                    });

                } else if(!rec) {

                    /*
                     * Data not stored in REDIS.
                     * Cache Missed
                     */

                    console.debug("Item not found.");
                    state.cacheMiss = true;

                } else if(state.secondaryIndex) {

                    /*
                     * if secondary, fCache will be called again.
                     * Setup the second call with the primary key.
                     */

                    console.debug("Found secondary index.");
                    state.secondaryIndex = false;
                    state.cacheKey = rec;

                } else {

                    /*
                     * The actual record was retrieved and can be returned.
                     */

                    try {
                        console.debug("Found item in cache.");
                        state.record = JSON.parse(rec);
                        state.cacheMiss = false;
                    } catch(e) {
                        console.error("Unable to parse cached record. Disregarding cached value.", e);
                        state.record = null;
                        state.cacheMiss = true;
                    }
                }

                return done();
            });
        }

        function _fFetch(done) {

            if(!state.cacheMiss)
                return done();

            console.debug("Cache Miss: Fetching record from DB");

            var params = makeDynamoQueryParams(opts.key, opts.index);
            dynamoClient.query(params, (err, rec) => {

                if(err) {
                    return done({
                        name: "DynamoError",
                        message: "Failed to fetch data from storage.",
                        innerError: err
                    });

                } else if(rec.Count == 0) {

                    /*
                     * The record was not found.
                     * There is nothing left to do.
                     */

                    console.debug("Record not found.");
                    state.updateCache = false;

                } else {

                    /*
                     * The data was found but needs to be writen to cache.
                     */

                    console.debug("Record found.");
                    state.record = rec.Items[0];
                    state.cacheKey = makeRedisKey(state.record);
                    state.updateCache = true;
                }

                return done();
            });
        }

        function _fWCache(done) {

            if(!state.record)
                return done();

            console.debug("Updating cache.");

            var multi = redisClient.multi();
            var keys =  Object.keys(keyAttributes);

            for(var i = 0; i < keys.length; i++) {

                var idx = makeRedisKey(state.record, keys[i]);
                var val = keys[i] === "PRIMARY"
                    ? JSON.stringify(state.record)
                    : state.cacheKey;

                if(state.updateCache) {
                    console.debug("Writing index: " + idx);
                    multi.set(idx, val);
                }

                console.debug("Setting expire on index: " + idx);
                multi.expire(idx, ttl)
            };

            multi.exec((err, replies) => {
                if(err)
                    return done({
                        name: "RedisError",
                        message: "Failed to update cache.",
                        innerError: err
                    });

                done();
            });
        }
    }

    function save(opts, cb) {

        /*
         * Save an item to the database.
         *
         * This operation will completely overwrite the current state of the
         * object. Any fields changes done outside of this process will be
         * clobbered
         *
         * Arguments:
         *  opts.item: The item to save.
         *  opts.ttl: The time, in seconds, the cache should live. Default: 86400
         *  opts.logLevel: The log log level used for this invocation.
         *  cb: A callback function containing the result of the fetch.
         */

        var ttl = opts.ttl || default_ttl;
        var console = new Log({ header: "DynamoCache:save", level: opts.logLevel || default_logLevel });

        var state = {
            cacheKey: makeRedisKey(opts.item),
            record: opts.item
        };

        var tasks = [
            _sRedis,
            _sDynamo
        ];

        // Update the `updateDate` only if the field is on the record.
        if(state.record && state.record.updateDate)
            state.record.updateDate = helpers.fmtDate();

        async.waterfall(tasks, (err) => {

            if(err)
                return cb({
                    name: "CachedTableError",
                    message: "Unable save changes to record.",
                    innerError: err
                });

            cb();
        });

        // --------------------------------------------------------------------

        function _sRedis(done) {

            if(!state.record)
                return done();

            console.debug("Updating cache.");

            var multi = redisClient.multi();
            var keys =  Object.keys(keyAttributes);

            for(var i = 0; i < keys.length; i++) {

                var idx = makeRedisKey(state.record, keys[i]);
                var val = keys[i] === "PRIMARY"
                    ? JSON.stringify(state.record)
                    : state.cacheKey;

                console.debug("Writing changes on index: " + idx);
                multi.set(idx, val);
                multi.expire(idx, ttl)
            };

            multi.exec((err, replies) => {
                if(err)
                    return done({
                        name: "RedisError",
                        message: "Failed to update cache.",
                        innerError: err
                    });

                done();
            });

        }

        function _sDynamo(done) {

            console.debug("Saving changes to storage.");

            var params = {
                TableName: tableName,
                Item: state.record
            };

            console.info("// TODO: REMOVE THIS LOG");
            console.info(JSON.stringify(params));

            dynamoClient.put(params, (err, dat) => {
                console.log("Result from dynamo...");
                console.log(err, dat);
                if(err)
                    return done({
                        name: "DynamoDB",
                        message: "Failed to put item in dynamo table.",
                        innerError: err
                    });

                done(null);
            });
        }
    }

    function update(opts, cb) {
        return cb({
            name: "NotImplemented",
            message: "This method is not implemented."
        });
    }

    function flush(opts, cb) {

        var multi = redisClient.multi();
        var keys =  Object.keys(keyAttributes);
        var console = new Log({ header: "DynamoCache:flush", level: opts.logLevel || default_logLevel });

        for(var i = 0; i < keys.length; i++) {
            var idx = makeRedisKey(opts.item, keys[i]);
            console.debug("Flushing index: " + idx);
            multi.del(idx);
        };

        multi.exec((err, replies) => {
            if(err)
                return cb({
                    name: "RedisError",
                    message: "Failed to flush cache.",
                    innerError: err
                });

            cb();
        });
    }

    function wrapTableItem(record) {

        /* 
         * This is a wrapper that hangs save, update and flush methods off the
         * record. This allows the caller to call save directly off a record
         * returned from fetch.
         *
         * Example:
         * table.fetch({ key: "123" }, (err, data) => {
         *   if(err) process.exit(1);
         *   data.message = "Hello, World";
         *   data.$save((e) => { console.log("COMPLETE", e); });
         * });
         *
         */

        if(!record)
            return record;

        record.$save = _save;
        record.$update = _update;
        record.$flush = _flush;

        return record;

        function _ga(args) {
            var cb = args.length > 1
                ? args[1]
                : args[0];

            var opts = args.length > 1
                ? args[0]
                : {};

            return {
                params: Object.create(opts, { item: { value: record } }),
                cb: cb
            };
        }

        function _save() { var args = _ga(arguments); save(args.params, args.cb); }
        function _flush() { var args = _ga(arguments); flush(args.params, args.cb); }
        function _update() { var args = _ga(arguments); update(args.params, args.cb); }
    }
}

function createFromName(opts, cb) {

    var dynamoClient = opts.dynamoClient,
        redisClient = opts.redisClient,
        tableName = opts.tableName;

    var params = {
        TableName: tableName
    };

    dynamoClient.describeTable(params, (err, desc) => {
        if(err)
            return cb({
                name: "DynamoError",
                message: `Failed to describe table ${params.TableName}`,
                innerError: err
            });

        var rec = new CachedTable({
            tableDesc: desc.Table,
            redisClient: redisClient,
            dynamoClient: dynamoClient,
            logLevel: opts.logLevel,
            ttl: opts.ttl
        });

        cb(null, rec);
    });
}

function createFromMap(opts, cb) {

    var dynamoClient = opts.dynamoClient,
        redisClient = opts.redisClient,
        tableMap = opts.tableMap;

    var fn = (tableName, key, next) => createFromName({
        dynamoClient: dynamoClient,
        redisClient: redisClient,
        tableName: tableName,
        logLevel: opts.logLevel,
        ttl: opts.ttl
    }, next);

    async.mapValues(tableMap, fn, cb);
}
