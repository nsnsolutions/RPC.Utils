'use strict';

const AWS = require('aws-sdk');
const async = require('async');
const _ = require('lodash');

const RedisCacheProvider = require('./RedisCacheProvider');
const computeCacheKey = require('./computeCacheKey');
const toProjection = require('./toProjection');
const selectAttr = require('./selectAttr');
const tableDesc2KeyMaps = require('./tableDesc2KeyMaps');
const item2Key = require('./item2Key');

const defaults = {
    url: "redis://localhost/0",
    ttl: 8600
}

module.exports = function DocumentClient(args) {

    var conf = args.cache;
    delete args.cache;

    var self = new AWS.DynamoDB.DocumentClient(args),
        opts = _.defaultsDeep(conf||{}, defaults),
        cache = opts.cacheProvider || new RedisCacheProvider(opts);

    var _super = {
        get: self.get,
        query: self.query
    };

    self.get = c_get;
    self.getSI = c_getSI;
    self.flush = c_flush;
    self.close = c_close;

    return self;

    // ------------------------------------------------------------------------

    function c_close() {

        /*
         * Close the connection in the cache provider.
         */

        try{ cache.close(); }
        catch(e) { }
    }

    function c_flush(params, callback) {

        /*
         * Delete a specific key from cache. This will not remove other data
         * associated with indexes shared by this record.
         */

        var index = params.IndexName || 'PRIMARY';
        var cacheKey = computeCacheKey(params.TableName, index, params.Key);
        cache.flush(cacheKey, callback);
    }

    function c_get(params, callback) {

        /*
         * Get an item from cache if possible.
         * Else, get a item from dynamo and put it in cache under it's primary
         * and secondary keys.
         */

        // Since the record might be added to cache, we need the entire record.
        // remove any attribute limits, It will be applied manualy on return.
        let AttributesToGet = params.AttributesToGet;
        delete params.AttributesToGet;

        // If the caller requested consistent read or BypassCache, go strait to
        // dynamo. This will still place a record in cache.
        if(params.BypassCache === true || params.ConsistentRead === true)
            // skip cache lookup and fetch from dynamo
            return _get();

        // Attempt to load a record from cache. If we can, send it back. If any
        // failure occurs, go to dynamo.
        var cacheKey = computeCacheKey(params.TableName, 'PRIMARY', params.Key);
        cache.get(cacheKey, (err, data) => {

            if(!err && data)
                // Cache hit! Re-apply AttributesToGet if needed and return the
                // data to the caller.
                return callback.call(self, null, {
                    Item: selectAttr(data, AttributesToGet),
                    ConsumedCapacity: null,
                    FromCache: true
                });

            // Cache miss! Go to dynamo
            return _get();
        });

        function _get() {

            console.log(params);
            // Fetch from dynamo in the ushual way.
            _super.get.call(self, params, function(err, data) {

                // If no errors, and good data
                if(!err && data.Item)

                    // Update the cache by placing the record under each key
                    // associated with the record as defined by the table
                    // description.
                    _add2Cache({
                        // Update cache
                        table: params.TableName,
                        item: data.Item
                    }, (err) => {

                        // Log error but do not halt.
                        if(err)
                            console.warn("An error was thrown wile trying to write to cache. ", err);

                        // Re-apply the AttributesToGet and return to caller.
                        data.Item = selectAttr(data.Item, AttributesToGet);
                        data.FromCache = false;
                        return callback.call(this, err, data);
                    });

                else
                    // An error or empty record was given from dynamo.
                    return callback.call(this, err, data);

            });
        }
    }

    function c_getSI(initialParams, callback) {

        /*
         * Get a all items under a given GSI/LSI from cache if possible.
         * Else, get all items from dynamo and put them in cache under each
         * primary and secondary key for each item returned.
         */

        // If no index is given, the key will be treated as primary, we can
        // offload this call to the c_get operation with a minor change to it's
        // response format.
        if(!initialParams.IndexName)
            return c_get(initialParams, (err, data) => {
                // Move Item to Items.
                if(data.Item)
                    data.Items = [data.Item];
                else if(!err)
                    data.Items = [];

                delete data.Item;
                callback(err, data);
            });

        // Limit params to the mimic dynamodb.get operation only with one
        // additional parameter: IndexName.
        var params = _.pick(initialParams, [
            'TableName',
            'IndexName',
            'AttributesToGet',
            'ConsistentRead',
            'ReturnConsumedCapacity',
            'ProjectionExpression',
            'ExpressionAttributeNames',
            'BypassCache'
        ]);

        // Since the record is cached after retrieval, remove any limits
        // imposed by AttributesToGet. They will be manually applied on return.
        let AttributesToGet = params.AttributesToGet;
        delete params.AttributesToGet;

        // If the caller requsted Consistent or bypass cache, go strait to
        // dynamo for the data. The result will still be cached.
        if(params.BypassCache === true || params.ConsistentRead === true)
            // skip cache lookup and fetch from dynamo
            return _get();

        // Attempt to load the record from cache.
        var cacheKey = computeCacheKey(params.TableName, params.IndexName, initialParams.Key);
        cache.getAll(cacheKey, (err, data) => {

            if(!err && data)
                // Cache hit! Apply the attributesToGet, if any, and return the
                // data to the caller.
                return callback.call(self, null, {
                    Items: selectAttr.each(data, AttributesToGet),
                    ConsumedCapacity: null,
                    FromCache: true
                });

            // Cache miss! go to dynamo for data.
            return _get();
        });

        function _get() {

            // This function uses the Query function and requires the use of
            // filter expressions. Convert the gsi/lsi to FilterExpressions.
            _key2conditionExpression(initialParams.Key, params);

            // Attempt to get data from dynamoDB
            _super.query.call(self, params, function(err, data) {

                // If no error and valid data...
                if(!err && data.Items.length > 0)

                    // Add each record found to cache. Store the record under
                    // each key assoicated with that record.
                    return _add2Cache_each({
                        table: params.TableName,
                        items: data.Items
                    }, (err) => {
                        // Log errors, Do not halt.
                        if(err)
                            console.warn("An error was thrown wile trying to write to cache. ", err);

                        // Re-apply the AttributesToGet if needed and return.
                        return callback.call(this, null, {
                            Items: selectAttr.each(data.Items, AttributesToGet),
                            ConsumedCapacity: data.ConsumedCapacity || null,
                            FromCache: false
                        });
                    });

                else 
                    // An error or no data was returned.
                    return callback.call(this, err, data);

            });
        }

        function _key2conditionExpression(key, params) {

            /*
             * Transforms a get style Key attribute into a query style
             * KeyConditionExpression attribute with attribute names/values.
             */

            var eaf = [], i = 0;
            params.ExpressionAttributeNames = {};
            params.ExpressionAttributeValues = {};

            _.forOwn(key, (v, k) => {
                // Each key is added with '#fsI' where I is an interger
                // inremented 1 time per loop. This will produce a filter
                // expression like: "#fs1 = :fs1 AND #fs2 = :fs2"
                params.ExpressionAttributeNames[`#f${i}`] = k;
                params.ExpressionAttributeValues[`:f${i}`] = v;
                eaf.push(`#f${i} = :f${i}`);
                i++;
            });

            // Add the filter expression to the given parameter object.
            params.KeyConditionExpression = eaf.join(" AND ");
            return params;
        }
    }

    function c_batchGet(params, callback) {
        /* This would be worth it i think */
    }

    function _add2Cache(params, callback) {
        
        /*
         * Adds params.item to redis under each key associated with that
         * record. The table description associated with params.table is used
         * to identify each key. It is assumed that table description is stored
         * in redis under the key: 'TABLE:${params.table}'. If it is not, the
         * record will not be added to redis.
         *
         * This function operates on a transaction and offered by the cache
         * provider.
         */

        // Fetch the table description for the current table.
        cache.get(`TABLE:${params.table}`, (err, td) => {

            if(err)
                return callback(err);

            /* build keys, this is a mess. 
             * 
             * maps: a list of all keys (primary, gsi, lsi) associated with
             *       this table.
             *
             * primaryKeyMap: Is the primary key. NOTE: It is assumed that the
             *                first entry in maps is the primary key.
             *
             * primaryKey: a Key:{...} map with values from the item for the
             *             primary key as defined by primaryKeyMap.
             *
             * primaryCacheKey: The string used to identify the primary key in
             *                  redis.
             */

            var maps = tableDesc2KeyMaps(td),
                primaryKeyMap = maps.shift(),
                primaryKey = item2Key(params.item, primaryKeyMap.key),
                primaryCacheKey = computeCacheKey(params.table, primaryKeyMap.index, primaryKey),
                trans = cache.multi();

            // Add the record under the primary key (expire is set automaticly)
            trans.set(primaryCacheKey, params.item);

            // Add the record under all gsi/lsi keys discovered in the TD.
            maps.forEach((keyMap) => {

                /* This is similar to the primary keys created above.
                 *
                 * secondaryKey: A Key:{...} map with values from item.
                 *
                 * secondaryCacheKey: The string used to identify the gsi/lsi
                 *                    key in redis.
                 */

                var secondaryKey = item2Key(params.item, keyMap.key),
                    secondaryCacheKey = secondaryKey && computeCacheKey(params.table, keyMap.index, secondaryKey);
                    
                // Add the record under the gsi/lsi (Expire is not automatic.)
                if(secondaryCacheKey) {

                    var val = toProjection({
                        item: params.item,
                        primaryKey: primaryKey,
                        secondaryKeyMap: keyMap
                    });

                    trans.setField(secondaryCacheKey, primaryCacheKey, val);
                    trans.expire(secondaryCacheKey);
                }
            });

            // Execute all transaction operations.
            trans.exec(callback)
        });
    }

    function _add2Cache_each(params, callback) {

        /*
         * A batch operation to add each record under each key associated with
         * that record into cache using the add2Cache function above.
         */

        async.each(
            params.items,
            (a, b) => _add2Cache({ 
                table: params.table,
                item: a 
            }, b), 
            callback
        );
    }
}
