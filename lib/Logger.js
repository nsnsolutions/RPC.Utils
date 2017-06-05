'use strict';

const LEVELS = {
    "-1": "SILENCE",
     "0": "ERROR",
     "1": "WARNING",
     "2": "INFO",
     "3": "DEBUG"
};

module.exports = Logger;

Logger.levels = {
    SILENCE: -1, silence: -1, quiet: -1, none: -1,
    ERROR: 0, error: 0, ERR: 0, err: 0,
    WARN: 1, warn: 1, WARNING: 1, warning: 1,
    INFO: 2, info: 2, DEFAULT: 2, "default": 2,
    DEBUG: 3, debug: 3
}

function Logger(opts) {

    /*
     * Redirect both error and non error to stdout for consolidated papertrail
     * logging.
     *
     * Arguments:
     *   opts.header:
     *     The header to wite infront of the log line.
     *     REQUIRED
     *
     *   opts.level:
     *     One of: SILENCE, ERROR, WARNING, INFO, DEBUG. Specify log level.
     *     Default: INFO
     *
     *   opts.stdout:
     *     The stream to use as stdout.
     *     Default: process.stdout.
     *
     *   opts.stderr:
     *     The stream to use as stderr.
     *     Default: process.stdout.
     */

    var header = opts.header || 'SERVICE',
        level = opts.level && Logger.levels[opts.level] || Logger.levels.DEFAULT,
        _context = Context(),
        _console = new console.Console(
            opts.stdout || process.stdout,
            opts.stderr || process.stdout);

    return {
        get level() { return LEVELS[level]; },
        get context() { return _context; },

        assert: logAssert,     // Level 0 (ERROR)
        error: logError,       // Level 0 (ERROR)
        warn: logWarn,         // Level 1 (WARN)
        info: logInfo,         // Level 2 (INFO)
        log: logInfo,          // Level 2 (INFO)
        time: logTime,         // Level 2 (INFO)
        timeEnd: logTimeEnd,   // Level 2 (INFO)
        timeD: logTimeD,       // Level 3 (DEBUG)
        timeEndD: logTimeEndD, // Level 3 (DEBUG)
        trace: logTrace,       // Level 3 (DEBUG)
        dir: logDir,           // Level 3 (DEBUG)
        debug: logDebug        // Level 3 (DEBUG)
    }

    // ------------------------------------------------------------------------

    function logAssert() {
        if(level < 0)
            return;
        write('assert', arguments, 'ERR');
    }

    function logError() {
        if(level < 0)
            return;
        write('error', arguments, 'ERR');
    }

    function logWarn() {
        if(level < 1)
            return;
        write('warn', arguments, 'WRN');
    }

    function logInfo() {
        if(level < 2)
            return;
        write('info', arguments, 'INF');
    }

    function logTime() {
        if(level < 2)
            return;
        _console.time(prep([ arguments[0] ], 'INF').join(' '));
    }

    function logTimeEnd() {
        if(level < 2)
            return;
        _console.timeEnd(prep([ arguments[0] ], 'INF').join(' '));
    }

    function logTimeD() {
        if(level < 3)
            return;
        _console.time(prep([ arguments[0] ], 'DBG').join(' '));
    }

    function logTimeEndD() {
        if(level < 3)
            return;
        _console.timeEnd(prep([ arguments[0] ], 'DBG').join(' '));
    }

    function logTrace() {
        if(level < 3)
            return;
        write('trace', arguments, 'DBG');
    }

    function logDir() {
        if(level < 3)
            return;
        write('dir', arguments, 'DBG');
    }

    function logDebug() {
        if(level < 3)
            return;
        write('info', arguments, 'DBG');
    }

    function write(n, args, sev) {
        _console[n].apply(null, prep(args, sev, true));
    }

    function prep(args, sev, withContext) {
        var withContext = !!(withContext);
        var ret = Array().splice.call(args, args);
        var _header = typeof sev !== 'undefined'
            ? _header = `${header}:${sev}`
            : header;

        if(withContext) {
            let ctx = _context.toString()
            if(ctx && ctx !== '{}') ret.unshift(ctx);
        }

        ret.unshift(`[ ${_header} ]`);
        return ret;
    }
}

const jsonic = require('jsonic');

function Context() {

    var obj = {};
    var props = [];

    return {
        toString: toString,
        add: add,
        remove: remove,
        clear: clear,
    };

    // ------------------------------------------------------------------------

    function toString() {
        return jsonic.stringify(obj);
    }

    function add(name, value) {
        obj[name] = value;
    }

    function remove(name) {
        delete obj[name];
    }

    function clear() {
        for(let p in obj)
            if(obj.hasOwnProperty(p))
                remove(p);
    }
}
