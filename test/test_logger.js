'use strict';

const assert = require('assert');
const rpcutil = require('../lib');

describe('Logger', () => {
    it('Can create logger', () => {
        var x = new rpcutil.Logger({ header: "nothing" });
        assert.ok(x, "Logger is returned nothing");
    });

    it('logger has error method', () => {
        var m = "error";
        var x = new rpcutil.Logger({ header: "nothing" });
        assert(m in x, "Logger has no " + m + " method.");
    });

    it('logger has warn method', () => {
        var m = "warn";
        var x = new rpcutil.Logger({ header: "nothing" });
        assert(m in x, "Logger has no " + m + " method.");
    });

    it('logger has info method', () => {
        var m = "info";
        var x = new rpcutil.Logger({ header: "nothing" });
        assert(m in x, "Logger has no " + m + " method.");
    });

    it('logger has debug method', () => {
        var m = "debug";
        var x = new rpcutil.Logger({ header: "nothing" });
        assert(m in x, "Logger has no " + m + " method.");
    });
});
