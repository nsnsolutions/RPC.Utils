'use strict';

const async = require('async');
const helpers = require('../helpers');
const Logger = require('../Logger');
const Steps = require('./Steps');

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
     *  opts.authorizer:
     *   Optional. A method that can evaluate access of a given person.
     *
     *   Example: (person) => { return true }
     *   (see rpc-utils.Principal for some canned methods)
     *
     *   If this option is NOT set, a guest person will be created and attached
     *   to state.$principal.
     *
     *   If this option is set, the authority service will be queried for
     *   information regarding the user identified by 'token'. The resulting
     *   principal object will be attached to state.$principal.
     *
     *   If no token is provided, a guest person will be created and attached
     *   to state.$principal. The result of opts.authorizer(guest) will then
     *   determin if the request is forbidden or not.
     *
     *   If a bad token is provided, the authority service will raise a
     *   authentication error which will be bubbled up and stop execution of
     *   the workflow.
     *
     *   Note: requires opts.transport
     *
     * opts.required:
     *   Optional. An Array of required arguments for a given workflow execution.
     *   Example: [
     *     { field: 'name', type: String, regex: '[a-zA-Z]{3,10}' },
     *   ]
     *
     *   Note: options type and regex are optional.
     *
     *   If a request is recieved that violates the expectations of the
     *   required field, a badRequest is returned to the caller and the 
     *   workflow execution is stopped.
     *
     * opts.optional:
     *   Optional. An Array of optional arguments for a given workflow
     *   execution.
     *   Example: [
     *     { field: 'name', type: String, regex: '[a-zA-Z]{3,10}', default: 'World' }
     *   ]
     *
     *   Note: Options, type, regex, and default are optional.
     *
     *   If a request is recieved and a field is present but violates the
     *   expectation of the optional field, a badRequest is returned to the
     *   caller and the workflow execution is stopped.
     *
     * opts.transport:
     *   Optioanl. A refrence to the seneca instance.
     *   Note: This is required if using opts.authorizer
     *
     *
     *
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

    // Ensure some defaults on opts for canned steps.
    opts.authorizer = opts.authorizer || false;
    opts.transport = opts.transport || false;
    opts.required = opts.required || [];
    opts.optional = opts.optional || [];

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
            stepFn.call(opts, stepLogger, state, (err, data) => {
                stepLogger.timeEndD(timerLabel);
                done(err, data);
            });
        }
    }

    function run(state) {

        var t = [
            start,
            (s,d) => Steps.getPrincipal.call(opts,logger,s,d),
            (s,d) => Steps.validateRequest.call(opts,logger,s,d)
        ];

        for(var i = 0; i < tasks.length; i++)
            t.push(doStep(i))

        t.push((s,d) => Steps.doPostActions.call(opts,logger,s,d));
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

                    else if(typeof err === 'object' && 'code' in err)
                        // RPC Callback Object using coded failure.
                        return rpcDone.error(err.code, message);

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
