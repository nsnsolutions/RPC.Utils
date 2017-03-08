'use strict';

const assert = require('assert');
const rpcUtils = require('../lib');
const uuid = require('uuid');

describe('computeRedisKey', () => {
    it('should return service specific cache key', () => {

        var srvName=uuid(),
            varName=uuid();

        var ret = rpcUtils.helpers.computeRedisKey(srvName, varName)
        assert.equal(ret, `${srvName}:${varName}`);
    });

    it('should return service specific cache key with optional fields', () => {

        var srvName='srv',
            varName='var',
            field="field:1";

        var ret = rpcUtils.helpers.computeRedisKey(srvName, varName, field)
        assert.equal(ret, `${srvName}:${varName}:field=1`);
    });

    it('should not change the order of the fields.', () => {

        var srvName='srv',
            varName='var',
            fields="zed:9,yanky:8,xray:7";

        var ret = rpcUtils.helpers.computeRedisKey(srvName, varName, fields)
        assert.equal(ret, `${srvName}:${varName}:zed=9:yanky=8:xray=7`);
    });

    it('should allow fields from a map.', () => {

        var srvName='srv',
            varName='var',
            fields={field1: 1, field2: 2};

        var ret = rpcUtils.helpers.computeRedisKey(srvName, varName, fields)
        assert.equal(ret, `${srvName}:${varName}:field1=1:field2=2`);
    });

    it('should allow n sets of fields.', () => {

        var srvName='srv',
            varName='var',
            fields={field1: 1, field2: 2},
            moreFields={field3: 3, field4: 4};

        var ret = rpcUtils.helpers.computeRedisKey(srvName, varName, fields, moreFields)
        assert.equal(ret, `${srvName}:${varName}:field1=1:field2=2:field3=3:field4=4`);
    });

    it('should allow mixed field arguments.', () => {

        var srvName='srv',
            varName='var',
            fields={field1: 1, field2: 2},
            moreFields="field3:3,field4:4";

        var ret = rpcUtils.helpers.computeRedisKey(srvName, varName, fields, moreFields)
        assert.equal(ret, `${srvName}:${varName}:field1=1:field2=2:field3=3:field4=4`);
    });

    it('should allow duplicate fields if given in seprate field arguments', () => {

        var srvName='srv',
            varName='var',
            fields="field1:1",
            moreFields="field1:10";

        var ret = rpcUtils.helpers.computeRedisKey(srvName, varName, fields, moreFields)
        assert.equal(ret, `${srvName}:${varName}:field1=1:field1=10`);
    });
});
