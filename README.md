# rpc-utils

Tools and utilities for use with RPC Services.

## Quick Start

Install rpc-utils. Replace ```<VERSION>``` with the version you would like to
use in your project.

```bash
npm install --save git://github.com/nsnsolutions/RPC.Utils.git#<VERSION>
```

Include the library in your project.

```javascript
const rpcUtils = require('rpc-utils');
```

## API

RPC Utilities is a collection of common code used to build RPC Services. There
are many options. For more information, please see the detailed documentation
below. It outlines specificly how to use a class or function.

- helpers: Simple helper functions for doing commen things.
- Executor: RPC Execution workflow manager.
- Logger: Logger with logLevel support and extra methods to target sev.
- CachedTable: A data access class that uses Redis and DynamoDB.
- Person: A object that can be used to check a users access level.
- FilterHelper: A class for building complex dynamo filters.
- ServiceProxy: DEPRICATED.

### helpers

Helpers is a set of simple functions to do common tasks such as, generate
dates, guids, and timestamps. 

Here is the full list of functions.

- fmtUuid: Create or format a GUID.
- fmtDate: Create or format a datetime string.
- fmtTimestamp: Create or format a unix timestamp.
- toHex: Convert an integer to hex.

#### fmtUuid

Create or Format a GUID (version 4). 

This method is mostly used for generating new UUIDs suitable for use as
database keys. 

| Argument | Type   | Default | Description |
| -------- | ------ | ------- | ----------- |
| uuid     | String | NULL    | An optional GUID to format. If not provided, a new GUID will be generated. |

If no argument is given, this method will create a new version 4 UUID, remove
the hyphens, and return it.  If a GUID is provided, the hyphens will be removed
and the resulting string will be returned. Note that you do not have to provide
a version 4 guid.

```javascript
// Create a new UUID
var new_uuid = rpcUtils.helpers.fmtUuid();
```

#### fmtDate

Create or Format a datetime string.

This method can be used for generating a new time string for ```now``` or
format a provided time. By default the time will be returned in ISO8601 format.

| Argument | Type                 | Default                 | Description |
| -------- | -------------------- | ----------------------- | ----------- |
| dt       | String, Date, Number | NULL                    | An optional date string, date object, or unix timestamp. |
| fmt      | String               | Y-MM-DDTHH:mm:ss.SSS[Z] | An optional string used to format the response data. |

If no argument is provided, or the first argument is null, the function will
return the current UTC Time in ISO8601 or the given format. If a time is given,
the value will be returned in ISO8601 or the given format.

```javascript
var new_ISO8601_date = rpcUtils.helpers.fmtDate();
```

#### fmtTimestamp

Create or format a unix timestamp.

This method can be used for generating a new unix timestamp for ```now``` or
format a provided time.

| Argument | Type                 | Default                 | Description |
| -------- | -------------------- | ----------------------- | ----------- |
| dt       | String, Date, Number | NULL                    | An optional date string, date object, or unix timestamp. |

If no argument is provided, the function will return the current UTC Time as a
count of seconds from Jan 1<sup>st</sup>, 1970. If a time is given, the
timestamp that is create will represent the given time.

```javascript
var new_unix_timestamp = rpcUtils.helpers.fmtTimestamp();
```

#### toHex

Convert an integer to hex.

This method can be used to convert an integer to hex and format it with a set
length using leading zeros for padding. This is uesfull for generating error
codes or printing debug output.

| Argument | Type                 | Default                 | Description |
| -------- | -------------------- | ----------------------- | ----------- |
| v        | Number               | N/A                     | The value to covert to hex. |
| pad      | Number               | 0                       | The minimum length of the resulting sring. |

If the second argument is not provded, the minimum posible length will be
returned.

```javascript
var hex_value = rpcUtils.helpers.toHex(42, 8); // will return 0000002A
```

### Executor

The Executor is a workflow manager desinged to simplify RPC call state
management. It also adds helpful logging features such as error code generation
and translates errors to RPC error codes if possible.

#### Executor Creation

An executor is a constructor method and will return an instance of executor.
The constructor parameters are as follows.

| Argument | Type                 | Default                 | Description |
| -------- | -------------------- | ----------------------- | ----------- |
| opts.name | String | N/A | The name of the workflow being executed. |
| opts.code | String | N/A | The code used to represent this workflow in the logging output. |
| opts.tasks | Array | N/A | A list of tasks that make up the workflow. Each task is a function.  Example: (console, state, done) => done(state); |
| opts.done | Callback | N/A | An RPCDone object containing a success method or a standard callback method. Executed at end of workflow. |
| opts.logLevel | String | [ENV Default] | The level to set the logger to for this workflow execution. |
| opts.repr | Function | [Passthrough] | Optional. A method that converts the last state into a response object. |

The following sections will provide more detail for each parameter.

##### Name

This is the name of the workflow used for logging.  This name will be visable
in the logs and can be visible in error message.  A workflow name should be a
few descriptive words.

Exampe Workflow Name

```json
name: "My Workflow (v1)"
```

##### Code

A workflow code is used to prefix each line  data that is writen to the
workflow logger during execution.  The code will be visible to the caller in
ther form of error codes. This is designed to help locate the workflow and step
a request failed in.

Example Workflow Code

```json
code: "MW01"
```

##### Tasks

Tasks are an array of Task Function that will be executed in order, one after
the other. It can fail the task by passing a value into the first argument of
the given callback and succeded by passing a null value into the first argument
of the provided callback. 

Note: In most cases, the workflow state should be forwarded in the second
argument of the given callback method.

Example Task handler.

```javascript
function task1_greet(console, state, callback) {

    console.info("Creating greeting.");

    if(!state.name)
        return callback({
            name: "badRequest",
            message: "Missing required field: name."
        });

    console.debug("Formating greeting for: ", state.name);
    state.set('message', "Hello, " + state.name + "!");

    callback(null, state);
}
```

##### done

Done can be either a standard callback function or a RPC Callback function. To
learn more about RPC Callback's, read the [RPCFW
Documentation](https://github.com/nsnsolutions/rpcfw).

##### logLevel

Loglevel is a string value used to set the severity level of the workflow
logger. In most cases, this value should come from the request state or the
system log level.

```javascript
logLevel: args.get('logLevel', defaultLogLevel)
```

##### repr

A repr function is a method that takes one argument and creates a specific and
consistent representation. Most commonly, a repr function will be one of sevral
canned representations for a project located in the project source code.

Example Repr Function

```javascript
function greet_v1(o) {
    return { message: o.message };
}
```

#### Run an executor

To execute a workflow using an instanciated execturor, call run on the executor
objet.

| Argument | Type   | Default | Description |
| -------- | ------ | ------- | ----------- |
| state    | Object | N/A     | The initial state of the workflow. |

It is common to use the rpc request's state as the initial state of the
workflow. This is convienient because it will contain all the arguments passed
to the method including authority tokens and transport details.

Full workflow example:

```javascript
function someHandler(data, callback) {

    var params = {
        logLevel: data.get('logLevel'),
        repr: greet_v1,
        name: "My Workflow",
        code: "MW01",
        done: callback,
        tasks: [ 
            validate,
            task1_greet
        ]
    };

    var executor = new rpcUtils.Executor(params);
    executor.run(data);
}
```

### Logger

// TODO: Documentation: Logger

Logger with logLevel support and extra methods to target sev.

### CachedTable

// TODO: Documentation: CacheTable

A data access class that uses Redis and DynamoDB.

### Person

// TODO: Documentation: Person

A object that can be used to check a users access level.

### FilterHelper

// TODO: Documentation: FilterHelper

A class for building complex dynamo filters.

### ServiceProxy

DEPRICATED. Do not use this method. The details of how to integrate common rpc
calls is still up in the air.
