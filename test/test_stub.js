'use strict';

const assert = require('assert');

describe('Basic Syntax', () => {
    it('Module can import', () => {
        try {
            var rpcutil = require('../lib');
            assert(true);
        } catch (e) {
            assert(false, String(e));
        }
    });
});
