'use strict';

const async = require('async');
const helpers = require('./helpers');
const Logger = require('./Logger');

module.exports = function Executor(opts) {

    /*
     * Execute a workflow.
     *
     * This workflow is designed to work with RPC Services.
     *
     * Arguments:
     *  opts.name:
     *   The name of the workflow being executed.
     *
     *  opts.code:
     *   The code used to represent this workflow in the logging output.
     *
     *  opts.tasks:
     *   A list of tasks that make up the workflow. Each task is a function.
     *   Example: (console, state, done) => done(state);
     *
     *  opts.done:
     *   An RPCDone object containing a success method or a standard callback
     *   method. Executed at end of workflow.
     *
     *  opts.logLevel:
     *   The level to set the logger to for this workflow execution.
     *
     *  opts.repr:
     *   Optional. A method that converts the last state into a response object.
     *   Default: (state) => { return state; }
     *
     */

    var name = opts.name;
    var code = opts.code;
    var tasks = opts.tasks;
    var rpcDone = opts.done;
    var repr = opts.repr || defaultRepr; //(o) => { return o; };
    var logger = new Logger({
        header: `${opts.code}:XX`,
        level: opts.logLevel 
    });

    var currentStep = 0;

    return { run: run };

    // ------------------------------------------------------------------------

    function doStep(index) {
        return _wrapper;
        function _wrapper(state, done) {

            var stepFn = tasks[index],
                timerLabel = `Step ${index+1} for workflow '${name}' completed in`,
                stepLogger = new Logger({
                    header: `${opts.code}:${helpers.toHex(index+1,2)}`,
                    level: opts.logLevel
                });

            currentStep = index+1;

            stepLogger.timeD(timerLabel);
            stepFn(stepLogger, state, (err, data) => {
                stepLogger.timeEndD(timerLabel);
                done(err, data);
            });
        }
    }

    function run(state) {
        var t = [ start ];

        for(var i = 0; i < tasks.length; i++)
            t.push(doStep(i))

        t.push(finish);

        // Start the task
        async.waterfall(t, finalize);

        function start(done) {
            logger.time(`Workflow '${name}' completed in`);
            logger.info(`Starting workflow '${name}' with ${tasks.length} tasks`);
            done(null, state);
        }

        function finish(state, done) {

            var result;

            try {
                result = repr(state);
            } catch(err) {
                return done({
                    name: 'internalError',
                    message: 'Failed to create representation for response.',
                    innerError: err
                });
            }

            return done(null, result);
        }

        function finalize(err, state) {
            try {
                if(err) {

                    var message = `${err.message} (ERR:${code}.${helpers.toHex(currentStep, 2)})`;

                    logger.error(`Error while executing step ${currentStep} in workflow '${name}'\n`, JSON.stringify(err, null, 2));

                    if(typeof err === 'object' && 'name' in err && err.name in rpcDone)
                        // RPC Callback Object using named failure.
                        return rpcDone[err.name](message);

                    else if(rpcDone.internalError)
                        // RPC Callback Object using generic failure.
                        return rpcDone.internalError(message);

                    else
                        // Standard callback failure
                        return rpcDone(err);
                }

                if(rpcDone.success)
                    // RPC Callback Object success.
                    return rpcDone.success(state);
                else
                    // Standard Callback success.
                    return rpcDone(null, state);

            } finally {
                logger.timeEnd(`Workflow '${name}' completed in`);
            }
        }
    }

    function defaultRepr(state) {
        return state;
    }

};
