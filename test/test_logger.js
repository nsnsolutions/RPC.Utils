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

    it('Can log for arbitrary contexts.', () => {
        var x = new rpcutil.Logger({ header: "nothing" });
        x.context.add('arbitrary', "value");
        assert(x.context.toString() === '{arbitrary:value}');
    });

    it('Can log for many arbitrary contexts.', () => {
        var x = new rpcutil.Logger({ header: "nothing" });
        x.context.add('arbitrary1', "value1");
        x.context.add('arbitrary2', "value2");
        assert(x.context.toString() === '{arbitrary1:value1,arbitrary2:value2}');
    });

    it('Can remove arbitrary contexts.', () => {
        var x = new rpcutil.Logger({ header: "nothing" });
        x.context.add('arbitrary1', "value1");
        x.context.add('arbitrary2', "value2");
        x.context.remove('arbitrary2');
        assert(x.context.toString() === '{arbitrary1:value1}');
    });

    it('Can reset contexts.', () => {
        var x = new rpcutil.Logger({ header: "nothing" });
        x.context.add('arbitrary1', "value1");
        x.context.add('arbitrary2', "value2");
        x.context.clear();
        assert(x.context.toString() === '{}');
    });
});
