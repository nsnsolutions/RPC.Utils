'use strict';

const assert = require('assert');
const rpcutil = require('../lib');

describe('Executor', () => {
    it('executes all steps', () => {

        var tasks = [
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
        ];

        var exec = new rpcutil.Workflow.Executor({
            name: "All steps execute",
            code: "asd1",
            tasks: tasks,
            done: _done,
            logLevel: 'silence'
        }).run(new rpcutil.VerifiableObject({ count: 0 }));

        function _done(err, state) {
            assert.equal(state.count, tasks.length, "Count of executions is not the same as count of tasks.");
        }
    });

    it('stops execution of steps on error', () => {

        var _state = { count: 0 };

        var tasks = [
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done({ name: "Error", message: "Testing Error" }, state); },
            (console, state, done) => { state.count++; done(null, state); },
        ];

        var exec = new rpcutil.Workflow.Executor({
            name: "All steps execute",
            code: "asdf",
            tasks: tasks,
            done: _done,
            logLevel: 'silence'
        }).run(new rpcutil.VerifiableObject(_state));

        function _done(err, state) {
            assert.notEqual(_state.count, tasks.length, "Count executed is the same as count of tasks.");
        }
    });

    it('forwards the exception to the final callback', () => {

        var _state = { count: 0 };
        var _error = { name: "Error", message: "Test Message" };

        var tasks = [
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(_error, state); },
            (console, state, done) => { state.count++; done(null, state); },
        ];

        var exec = new rpcutil.Workflow.Executor({
            name: "All steps execute",
            code: "asdf",
            tasks: tasks,
            done: _done,
            logLevel: 'silence'
        }).run(new rpcutil.VerifiableObject(_state));

        function _done(err, state) {
            assert.equal(err, _error, "Diffrent error.");
        }
    });

    it('supports RPC Done callback objects.', () => {

        var _state = { count: 0 };

        var tasks = [
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
        ];

        var exec = new rpcutil.Workflow.Executor({
            name: "All steps execute",
            code: "asdf",
            tasks: tasks,
            done: { success: _done },
            logLevel: 'silence'
        }).run(new rpcutil.VerifiableObject(_state));

        function _done(state) {
            assert.equal(state.count, tasks.length, "execution count differs from task count.");
        }
    });

    it('supports RPC Done callback object with named error handlers.', () => {

        var _state = { count: 0 };

        var tasks = [
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done(null, state); },
            (console, state, done) => { state.count++; done({ name: "CustomError", message: "Test Error" }, state); },
            (console, state, done) => { state.count++; done(null, state); },
        ];

        var exec = new rpcutil.Workflow.Executor({
            name: "All steps execute",
            code: "asdf",
            tasks: tasks,
            done: { CustomError: _done },
            logLevel: 'silence'
        }).run(new rpcutil.VerifiableObject(_state));

        function _done(err) {
            assert.equal(err, "Test Error (ERR:asdf.04)");
        }
    });
});
