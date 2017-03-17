'use strict'

const async = require('async');
const Logger = require('../../Logger');
const helpers = require('../../helpers');

module.exports = doPostActions;

function doPostActions(console, state, done) {

    /* This step will execute all items in the postAction array.
     * You can alter the content of the post action array during execution.
     *
     * Required workflow params
     *  - postAction: List of tasks to execute.
     */

    var self = this,
        ps = self.postActions || [],
        index = 0;

    done(null, state);

    async.forever(
        (next) => { 
            var fn = ps.shift();

            if(fn)
                doStep(fn, index++, next);
        },
        (err) => {
            if(err)
                console.error("Post execution has been halted due to an error:\n", JSON.stringify(err, null, 2));
        }
    );

    function doStep(fn, idx, next) {

        var timerLabel = `Post Action ${idx+1} completed in`;
        var stepLogger = new Logger({
            header: `PostAction:${self.code}:${helpers.toHex(idx+1,2)}`,
            level: console.level
        });

        stepLogger.timeD(timerLabel);

        fn.call(self, stepLogger, state, (err, data) => {
            if(err)
                console.error("Error while executing postActions\n", JSON.stringify(err, null, 2));
            stepLogger.timeEndD(timerLabel);
            next(null, data);
        });
    }
}
