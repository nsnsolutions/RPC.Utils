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
- DocumentClient: DynamoDB Access client that takes advantage of chaching.
- Logger: Logger with logLevel support and extra methods to target sev.
- Person: A object that can be used to check a users access level.
- FilterHelper: A class for building complex dynamo filters.

### helpers

Helpers is a set of simple functions to do common tasks such as, generate
dates, guids, and timestamps. 

Here is the full list of functions.

- fmtUuid: Create or format a GUID.
- fmtDate: Create or format a datetime string.
- fmtTimestamp: Create or format a unix timestamp.
- toHex: Convert an integer to hex.
- computeRedisKey: Produce a service specific variable used to store data in
  redis.

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
#### computeRedisKey

Produce a service specific variable used to store data in redis.

This method can be used to create a key for a service that can have any level
of specificity as required for the applications needs.

| Arguments | Type   | Default   | Description |
| --------- | ------ | --------- | ----------- |
| service   | String | N/A       | The name of the service. eg: tokenService |
| variable  | String | N/A       | A application spcific identifier.         |
| fields    | Object | undefined | A map of keys to values that will be used to create specific identifers for a key |
| ...       | Object | undefined | Additional field groups. |

__Example:__

```javascript
var key = rpcUtils.helpers.computeRedisKey('MyService', 'MyVar', { Id: 123, Type: 'apples' });
redis.sadd(key, 'New apples for customer 123')
```

The above example would produce the following redis key:

```MyService:MyVar:Id=123:Type=apples```

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
| opts.authorizer | Function | false | Optional. A function that accepts a principal object and returns a boolean value indicating if the action requested is authorized. |
| opts.required | Array | [] | Optional. A list of required field specifications. |
| opts.optional | Array | [] | Optional. A list of optional field specifications. |

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

__Example Workflow Code:__

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

__Example Task handler:__

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

__Example Repr Function:__

```javascript
function greet_v1(o) {
    return { message: o.message };
}
```

##### authorizer

A function that accepts a principal object and returns a boolean value
indicating if the action requested is authorized.

An authorizer can be any function that returns a true or false but there are a
few canned authorizers in the RPC-Utils.Principal.Authorizers namespace.

- isAuthenticated: Returns true if the current principal is authenticated (not guest)
- withAll: Returns true if the current principal has ALL of the access required by the given access list.
- withAny: Returns true if the current principal has ANY of the access required by the given access list.
- with: Returns true if the current principal has access as required by the given access string.

__Examples:__

```javascript
params = {

    // Will require a user was idetified that is not a guest.
    authorizer: rpcUtils.Principal.Authorizers.isAuthenticated(),

    // Will require a user has, at least, all the given access levels.
    authorizer: rpcUtils.Principal.Authorizers.withAll(['JOB:10', 'PRODUCT:10']),

    // Will require a user has, at least, one of the given access levels.
    authorizer: rpcUtils.Principal.Authorizers.withAny(['JOB:10', 'PRODUCT:10']),

    // Will require a user has at least the given level of access.
    authorizer: rpcUtils.Principal.Authorizers.with('JOB:10'),
}
```

##### required

A list of required field specifications.

A field specifcation has the following arguments:

| Argument  | Required | Description |
| --------- | -------- | ----------- |
| field     | Yes      | Identifies the name of the required field. |
| type      | No       | If defined, identifies the type for the given field.  |
| minLength | No       | If defined, idnetifies the min length of the data in the field |
| maxLegnth | No       | If defined, identifies the max length of the data in the field |
| regex     | No       | If defined, provides regular expression (as string) that will be used to test the value in the field. |

If any of the checks fail, a badRequest is sent to the user and the workflow
execution is stopped.

__Example:__

```javascript
var params = {
    required = [
        { field: 'arg1' },
        { field: 'arg2', type: String },
        { field: 'arg3', type: String, regex: '[a-z]{3,10} }
    ]
}
```

##### optional

A list of optional field specifications.

A field specifcation has the following arguments:

| Argument  | Required | Description |
| --------- | -------- | ----------- |
| field     | Yes      | Identifies the name of the required field. |
| type      | No       | If defined, identifies the type for the given field.  |
| minLength | No       | If defined, idnetifies the min length of the data in the field |
| maxLegnth | No       | If defined, identifies the max length of the data in the field |
| regex     | No       | If defined, provides regular expression (as string) that will be used to test the value in the field. |
| default   | No       | If defined, will set the value on state if the user didnt provide a vaule.  |

Checks are only made if the field is included in the state. If it is not
included and a default value is provided, the state will be set with the given
field using the value defined in default.

If a check is made and it fails any of the steps, a badRequest is sent to the
user and the workflow execution is stopped.

__Example:__

```javascript
var params = {
    optional = [
        { field: 'arg1' },
        { field: 'arg2', type: String },
        { field: 'arg3', type: String, regex: '[a-z]{3,10} }

        // note that the default value does not have to validate.
        { field: 'arg4', type: String, regex: '[a-z]{3,10}, default: false }
    ]
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

__Full workflow example:__

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
        ],
        required: [
            { field: 'name', type: String, regex: '[a-z]{3,10}' }
        ],
        optional: [
            { field: 'flag', type: Boolean, default: false }
        ],
        authorizer: rpcUtils.Principal.Authorizers.with('access:1')
    };

    var executor = new rpcUtils.Workflow.Executor(params);
    executor.run(data);
}
```

### DocumentClient

The DynamoDB DocumentClient is a wrapper around the
AWS.DynamoDB.DocumentClient. It intercepts GET calls to dynamo and attempts to
look the record up in REDIS before going to the database.

This class's interface is a supper set of the AWS DynamoDB DocumentClient.
Please review the [Amazon DynamoDB Documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)
 
#### Constructor

The construction of the object is mostly identical to that of
AWS.DynamoDB.DocumentClient except a new configuration parameter is examined.

__Example:__

```javascript
var params = {
    region: 'us-west-2',
    cache: {
        url: "redis://localhost/0",
        ttl: 86000
    }
}

var ddbClient = new rpcUtils.DynamoDB.DocumentClient(params);
```

You can provide additional arguments to the cache system. Here is a full list
of supported parameters

| Argument           | Type          | Default             | Description       |
| ------------------ | ------------- | ------------------- | ----------------- |
| cache.url          | String        | redis://localhost/0 | A url that identifies where to connect to the cache layer. |
| cache.ttl          | Number        | 86000               | The number of seconds a record will live in the cache after each time it has been touched. |
| cache.disableCache | Boolean       | false               | Configuration override to disable the caching layer. Inded for development only. |
| cache.provider     | `Constructor` | null                | If provided, overrides the default cache provider to the one specified. |

The disableCache option is intended to facilitate development.  In live
environments, a secondary service named `VFS_DynamoCacheUpdater` is run on
tables each time a table record is udpated. This deals with the complexity of
cache invalidation.  If you are running your code locally, this service will
not work to invalidate your local cache copy.  Because of this, it is
recomended to use your local ETCD configuration to disable caching.

__Example RCP Setup:__

```javascript
function bootstrap(bus, conf) {
  ddbClient = new rpcUtils.DynamoDB.DocumentClient({
    region: conf.shared.region,
    cache: {
      // ETCD Does not support datatypes. Convert from string to boolean.
      disableCache: conf.shared.get('disableCache', 'false').toLowerCase() == "true",
      url: conf.shared.dynamoCache,
      ttl: 86000 // Cache time to live: 1 day.
    }
  });

  /* ... */

}
```

#### Method: Get

Dynamo GET operation to fetch a single record by primary key.  This is the same
function as the DynamoDB.DocumentClient.get operation. See the [Amazon DynamoDB DocumentClient GET documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#get-property)

There are a few operational diffrences between the AWS documentClient and the
rpcUtils documentClient.

1. If ConsistentRead is enabled, cache is bypassed.
3. AttributesToGet is supported but the full record is pulled over the network.

Additional Arguments:

| Arguments   | Type    | Default | Description |
| ----------- | ------- | ------- | ----------- |
| BypassCache | Boolean | false   | If true, the record will be fetched from dynamo. This does update the cache provder with the new record. |

__Example:__

```javascript

var params = {
    TableName: 'MyTable',
    Key: { id: "abc123" }
}

ddbClient.get(params, (err, data) => {
    if(err)
        console.log(err);
    else
        console.log(data);
});
```

__Example Bypass Cache:__

```javascript

var params = {
    TableName: 'MyTable',
    BypassCache: true,
    Key: { id: "abc123" }
}

ddbClient.get(params, (err, data) => {
    if(err)
        console.log(err);
    else
        console.log(data);
});
```

The response data is the same as the AWS DynamoDB DocumentClient get operation
with 1 addtional field that indicates if the record was fetched from cache or
not.

__Example Response:__

```json
{
  Item: { id: "abc123", message: "Hello, World" },
  ConsumedCapacity: null,
  FromCache: true
}
```

#### Method: Get Secondary Index

__Please see warning at the bottom of this section.__

Dynamo GETSI operation to fetch records by secondary keys.  This is similar
functionality to that provded by the AWS.DynamoDB.DocumentClient.query
operation except it follows the GET interface in query structure. 

The primary diffrence between getSI and aws's query operation is that Filter
expressions are NOT supported.

The primary diffrence between get and getSI is that a secondary index can be
provided, and data is returned with an array of Items as opposed to a single
item.

The same operational diffrences exist with concern to cach control options:

1. If ConsistentRead is enabled, cache is bypassed.
3. AttributesToGet is supported but the full record is pulled over the network.

Additional Arguments:

| Arguments   | Type    | Default | Description |
| ----------- | ------- | ------- | ----------- |
| BypassCache | Boolean | false   | If true, the record will be fetched from dynamo. This does update the cache provder with the new record. |

__Example:__

```javascript

var params = {
    TableName: 'MyTable',
    IndexName: 'message-index',
    Key: { message: "Hello, World" }
}

ddbClient.getSI(params, (err, data) => {
    if(err)
        console.log(err);
    else
        console.log(data);
});
```

__Example Bypass Cache:__

```javascript

var params = {
    TableName: 'MyTable',
    BypassCache: true,
    IndexName: 'message-index',
    Key: { message: "Hello, World" }
}

ddbClient.getSI(params, (err, data) => {
    if(err)
        console.log(err);
    else
        console.log(data);
});
```

The response data is the same as the AWS DynamoDB DocumentClient get operation
except a list if Items is returned and 1 addtional field that indicates if the
records where fetched from cache or not.

__Example Response:__

```json
{
  Items: [ { id: "abc123", message: "Hello, World" } ],
  ConsumedCapacity: null,
  FromCache: true
}
```

__WARNING: Due to the way DynamoDB Works and the concept of secondary indexes,
it is possible to retrieve an incomplete set of information using cache.__

Because of this, it is recomended that you only use secondary indexes that
return a single record OR only fetch on SI for records that you know are in
cache.

#### Method: Close

Close the connection to the cache provider.

__Example:__

```javascript
if(ddbClient && ddbClient.close)
    ddbClient.close();
```

#### Method: Flush

Clear a key from cache.

| Argument  | Type   | Default | Description |
| --------- | ------ | ------- | ----------- |
| TableName | String | N/A     | The table of which the record is a member. |
| IndexName | String | null    | The index name represented in key. (Do not include if key is a primary key.) |
| Key       | Object | N/A     | The object that contains the key that identifies the record. |

__Example:__

```javascript
var params = {
    TableName: 'MyTable',
    Key: { id: "abc123" }
};

ddbClient.flush(params, (err) => {
    if(err)
        console.log(err);
});
```

### Logger

The logger is a wrapper around a new instance of console.Console. By default
this logger will write message to stdout only (including errors) with
consideration to the current log level and the severity level of the logged
message.

#### Constructor

The constructor class takes four optional arguments passed in through a single
options argument.  You can create the logger with an empty options argument to
take all the default values.

__Example:__

```javascript
var logger = new rpcUtils.Logger({});
```

You can provide arguments to alter the behavor of the logger.

| Argument | Type   | Default | Description |
| -------- | ------ | ------- | ----------- |
| opts.header | String | 'SERVICE' | The header to wite infront of the log line. |
| opts.level | String | 'info' | A valid log level. See below. |
| opts.stdout | Stream | [STDOUT] | The stream to use as stdout. |
| opts.stderr | Stream | [STDOUT] | The stream to use as stderr. |

Valid log levels are exposed through rpcUtils.Logger.levels. They are listed
here for simplicity:

- SILENCE: No log output at all. This is used in unit tests.
 - >> SILENCE, silence, quiet, none
- ERROR: Only show log messages for errors.
 - >> ERROR, error, ERR, err
- WARN: Only show log messages for warnings and errors.
 - >> WARN, warn, WARNING, warning
- INFO: Only show log messages for information, warnings, and errors.
 - >> INFO, info, DEFAULT, default
- DEBUG: Show all log messages including debug.
 - >> DEBUG, debug

__Example:__

```javascript
var logger = new rpcUtils.Logger({
    header: "MyService",
    level: rpcUtils.Logger.Levels.info
});
```

#### Instance

Once a logger has been created, it offers several methods in addition to the
standard console object.

- __level__: Gets the current log level.
- __assert__: Same  as console.assert (severity: error)
- __error__: same as console.error (severity: error)
- __warn__: same as console.warn (severity: warning)
- __info__: same as console.info (severity: info)
- __log__: same as console.log (severity: info)
- __time__: same as console.time (severity: info)
- __timeEnd__: same as console.timeEnd (severity: info)
- __timeD__: same as console.time (severity: debug)
- __timeEndD__: same as console.timeEnd (severity: debug)
- __trace__: same as console.trace (severity: debug)
- __dir__: same as console.dir (severity: debug)
- __debug__: same as console.info (severity: debug)

__Example:__

```javascript
var logger = new rpcUtils.Logger({
    header: "MyService",
    level: rpcUtils.Logger.Levels.info
});

logger.debug("This message is not visable.");

logger.info("This message is visable.");
// [MyService:INF] This message is visable.

logger.warn("This warning is visable.");
// [MyService:WRN] This warning is visable.

```

### Person

A Person object represents claim information decoded by RPC.AccountService.  It
has methods to simplify authority checking and validates required data.

Person is a construction method that requires a claim object from
RPC.AccountService.

__NOTE: There is a plan to implement the RPC.AccountService call on this object once
the Proxy interface is fully understood.__

__Example:__

```javascript

// Where claim was the result of a seneca.act call to AccountService.GetToken
var person = new Person(claim);
```

#### Properties

| Name               | Type   | Description                                                          |
| ------------------ | ------ | -------------------------------------------------------------------- |
| sponsorId          | String | Gets the Sponsor ID that issued the claim.                           |
| sponsorName        | String | Gets the name of the Sponsor that issued the claim.                  |
| sponsorKey         | String | Gets the Sponsor Key that issued the claim.                          |
| clientId           | String | Gets the Client ID The user belongs to.                              |
| clientName         | String | Gets the Client Name the user belongs to.                            |
| clientKey          | String | Gets the Client Key that the user belongs to.                        |
| userId             | String | Gets the Sponsor proivded unique identifier.                         |
| username           | String | Gets the Sponsor provided username.                                  |
| email              | String | Gets the Sponsor provided email address.                             |
| fullName           | String | Gets the Sponsor Provided full name.                                 |
| photoUrl           | String | Gets the Sponsor Provided URL.                                       |
| phoneNumber        | String | Gets the Sponsor Provided phone number for user.                     |
| address.singleLine | String | Gets the Sponsor Provided address of user.                           |
| address.line1      | String | Gets the Sponsor Provided Address of user (line 1).                  |
| address.line2      | String | Gets the Sponsor Provided Address of user (line 2).                  |
| address.city       | String | Gets the Sponsor Provided Address of user (City).                    |
| address.state      | String | Gets the Sponsor Provided Address of user (State).                   |
| address.zip        | String | Gets the Sponsor Provided Address of user (Zip).                     |
| roles              | Array  | Gets an array of all the roles assigned to this user by the sponsor. |

#### Method: inRole

Returns a boolean value indicating weather a claim's role data includes a
specific value.

__Example:__
```javascript
if(person.inRole('JOB:30')) {
    // person has exactly level 30 access to job
}
```

#### Method: hasAuthority

Returns a boolean value indicating weather a claim's role data meets or exceeds
the given authority requirements.

__Example:__
```javascript
if(person.hasAuthority('JOB:30')) {
    // person has atleast level 30 access to job
}
```

#### Method: hasAnyAuthority

Returns a boolean value indicating weather a claim's role data meets or exceeds
at least one of the given set of authority requirements.

__Example:__
```javascript
if(person.hasAnyAuthority(['JOB:30', 'ACC:20'])) {
    // person has either atleast level 30 access to job or level 20 access to acc.
}
```

#### Method: hasAllAuthority

Returns a boolean value indicating weather a claim's role data meets or exceeds
all of the given set of authority requirements.

__Example:__
```javascript
if(person.hasAllAuthority(['JOB:30', 'ACC:20'])) {
    // person has atleast level 30 access to job and level 20 access to acc.
}
```

#### Method: toString

Returns string information that represents the current claim. Useful for debug,
not intended for customer consumption.

__Example:__
```javascript
console.log(person.toString())
// <Person(fullName='John Public' email='jonny@velma.com')>
```

### FilterHelper

Filter helper is a class used to create DynamoDb query methods. This is uesfull
for implementing filter methods on sets of data.

Filter Helper is a constructor function that returns an instance of
filterHelper.

__Arguments are the same arguments you would pass to AWS.DynamoDB.Query.__ You
can use this to preload specific details about the operation such as hash or
range key limits. __TableName is required.__

__Example:__
```javascript
var query = new rpcUtils.FilterHelper({
    TableName: "MyTable",
    KeyConditionExpression: '#hkey = :hkey',
    ExpressionAttributeNames: { '#hkey': "someKey" },
    ExpressionAttributeValues: { ':hkey': "abc123" }
});
```

#### StaticMethod: parseFilterString

Convert a string of filter data into an array suitable for use with
filterHelper.addFilters() method.

This is a static method hung directly off the constructor class.

__Example:__
```javascript
var str = 'createDate:BETWEEN:2017-01-01T00:00:00.000Z,2017-02-01T00:00:00.000Z;price:GE:100';
var filterArray = rpcUtils.FilterHelper.parseFilterString(str);
```

The filter string logic is as follows:

1. Split string on ';'
2. Split part on ':'
3. part[0] is the __FieldName__
4. part[1] is the __Operator__
5. split part[2] on ',' is the operation __Argument__.

#### Method: addFilter

Add more filter data to the filterHelper query object.

| Argument  | Type   | Default | Description.                                                            |
| --------- | ------ | ------- | ----------------------------------------------------------------------- |
| FieldName | String | N/A     | The name of the field. This can be a nested field name. eg: 'user.name' |
| Operation | String | N/A     | Operation selector _See below_.                                         |
| Argument  | Array  | N/A     | An array of operation dependent arguments.                              |

__Example:__
```javascript
// Add BETWEEN filter
query.addFilter('createDate', 'BETWEEN', [ '2017-01-01T00:00:00.000Z', '2017-02-01T00:00:00.000Z'])

// Add Equality filter
query.addFilter('price', '>=', [ 100 ])
```

#### Method: addFilters

Add an array of filters to the filterHelper query object.

| Argument | Type  | Default | Description                      |
| -------- | ----- | ------- | -------------------------------- |
| args     | Array | N/A     | An array of addFilter arguments. |

```javascript
query.addFilters([
    [ 'createDate', 'BETWEEN', [ '2017-01-01T00:00:00.000Z', '2017-02-01T00:00:00.000Z'] ],
    [ 'price',      '>=',      [ 100 ] ]
]);
```

#### Method: compileQuery

Build the query with all the filters applied to the instance of filterHelper.

```javascript
vary qs = query.compileQuery();

dynamoDb.query(qs, (err, data) => {
    ...
});
```
