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
- CachedTable: DEPRICATED.
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
        ]
    };

    var executor = new rpcUtils.Executor(params);
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

### CachedTable

CachedTable is an object that can be used to fetch and save records from
DynamoDB using a caching layer for performance and more efficient read
consumption.

CachedTable is a constructor function that will return a cachedTable instance.
There is also a static method that will build the cachedTable definition based
on a given DynamoDb table name.

#### Constructor

Create a cachedTable instance using the given DynamoDb Table Description.

| Argument          | Type   | Default   | Description |
| ----------------- | ------ | --------- | ----------- |
| opts.dynamoClient | Object | N/A       | A reference to a connected AWS.DynamoDB object. |
| opts.redisClient  | Object | N/A       | A reference to a connected redis.client object. |
| opts.ttl          | Number | 86000     | Optional: The amount of time, in seconds, a cache item should live by default. |
| opts.logLevel     | String | 'DEFAULT' | Optional: The named log level to use in the logger. |
| opts.tableDesc    | Object | N/A       | A DynamoDB Table Description as returned by AWS.DynamoDB.describeTable method. |

It is not recomended to call this constructor directly, but it is available if
required. You should use ```CachedTable.Create``` whenever possible.

__Example:__

```javascript
var dynamoClient = new AWS.DynamoDB({ region: REGION });
var redisClient = redis.createClient();

dynamoClient.describeTable({ TableName: "myTable" }, (err, desc) => {

    if(err) { /* Handle Error */ }

    var cachedTable = new CachedTable({ 
        dynamoClient: dynamoClient,
        redisClient: redisClient,
        logLevel: state.get('logLevel'),
        tableDesc: desc.Table
    });

    // cachedTable is ready to use.
});

```

Since cachedTable only represents __one__ dynamo table, it is likely that you
will need to do quite a buit of work to create all the references you need. To
simplify that, CachedTable.Create is the recomended method for created a
instance of CachedTable.

#### CachedTable.Create

Create a CachedTable or map of CachedTable objects from the given tableName or
tableMap respectivly using the provided Dynamo Client connection.

| Argument          | Type     | Default   | Description                                                                    |
| ----------------- | -------- | --------- | ------------------------------------------------------------------------------ |
| opts.dynamoClient | Object   | N/A       | A reference to a connected AWS.DynamoDB object.                                |
| opts.redisClient  | Object   | N/A       | A reference to a connected redis.Client object.                                |
| opts.tableName    | String   | null      | The name of the table for which to create the cache Object.                    |
| opts.tableMap     | Object   | null      | A map that identifes what tables to load.                                      |
| opts.ttl          | Number   | 86000     | Optional: The amount of time, in seconds, a cache item should live by default. |
| opts.logLevel     | String   | "DEFAULT" | Optional: The named log level to use in the logger.                            |
| cb                | Function | N/A       | Callback to execute once complete.                                             |

_NOTE: One of the two argumetns: ```opts.tableName```, ```opts.tableMap```,
must be specified._

_NOTE: The map keys can be any thing you would like. The value of each field in
the map should be the name of the table for which to create the CachedTable
object.  Example: ```{ t1: "Dynamo_TableName", t2: "Dynamo_TableName2" }```_

_NOTE: If a single tableName is given, the data will contain an instance of
CachedTable that represents that table.  If a tableMap is given, the data will
contain a map of CachedTable instances that match the keys of the given
tablemap._

__Example (Single Table):__

```javascript

var params={
    dynamoClient: new AWS.DynamoDb({region: REGION}),
    redisClient: redis.createClient(),
    tableName: 'MyTable'
}

CachedTable.Create(params, (err, table) => {
    if(err) { /* Handle error */ }

    // table is ready to use.
});

```

__Example (Multi Table):__

```javascript

var params={
    dynamoClient: new AWS.DynamoDb({region: REGION}),
    redisClient: redis.createClient(),
    tableMap: {
        myTable: 'MyTable',
        yourTable: 'YourTable'
    }
}

CachedTable.Create(params, (err, tables) => {
    if(err) { /* Handle error */ }

    // tables.myTable is ready to use.
    // tables.yourTable is ready to use.
});

```

#### Method: fetch

Retrieve a record.

This method will attempt to retrieve the record from cache. If the
data is not found, it will go to the database for the record. If
found, the record will be returned and added to cache. If not found, a null
value will be returned.

| Agument       | Type     | Default             | Description                                                        |
| ------------- | -------- | ------------------- | ------------------------------------------------------------------ |
| opts.key      | Object   | N/A                 | An object containting the keys needed to located the record.       |
| opts.index    | String   | null                | Optional: A string indicating the secondary index (if applicable). |
| opts.ttl      | Number   | [instance.ttl]      | Optional: Override the time, in seconds, the cache should live.    |
| opts.logLevel | String   | [instance.logLevel] | Optional: Override the log level used for this invocation.         |
| cb            | Function | N/A                 | A callback function containing the result of the fetch.            |

__Example (Primary Index):__

```javascript
var params = {
    key: { someKey: 'abc123' },
    logLevel: state.get('logLevel')
};
table.fetch(params, (err, record) => {
    if(err) { /* handle error */ }

    // record is a Object that represents the DynamoDB Record.

});
```

Fetch will wrap a record object and decorate 3 helper methods that can be used
to write changes back to cache/storage.

- $save: Replace cache and storage with this object.
- $update: Save only changed fields (Not yet implemented).
- $flush: Reset record to initial fetch state.


#### Method: save

Save an item to the database.

This operation will completely overwrite the current state of the
object. Any fields changes done outside of this process will be
clobbered

| Agument       | Type     | Default             | Description                                                     |
| ------------- | -------- | ------------------- | --------------------------------------------------------------- |
| opts.item     | Object   | N/A                 | The item to save.                                               |
| opts.ttl      | Number   | [instance.ttl]      | Optional: Override the time, in seconds, the cache should live. |
| opts.logLevel | String   | [instance.logLevel] | Optional: Override the log level used for this invocation.      |
| cb            | Function | N/A                 | A callback function containing the result of the fetch.         |

__Example:__

```javascript
var params = {
    item: record,
    logLevel: state.get('logLevel')
};

table.save(params, (err) => {
    if(err) { /* handle error */ }
})
```

#### Method: update (NOT IMPLEMENTED)

__This method is not yet implemetned - The interface might  change.__

Save only changed fields in an item to the database.

| Agument       | Type     | Default             | Description                                                     |
| ------------- | -------- | ------------------- | --------------------------------------------------------------- |
| opts.item     | Object   | N/A                 | The item to get fields to save.                                 |
| opts.ttl      | Number   | [instance.ttl]      | Optional: Override the time, in seconds, the cache should live. |
| opts.logLevel | String   | [instance.logLevel] | Optional: Override the log level used for this invocation.      |
| cb            | Function | N/A                 | A callback function containing the result of the fetch.         |

__Example:__

```javascript
var params = {
    item: record,
    logLevel: state.get('logLevel')
};

table.update(params, (err) => {
    if(err) { /* handle error */ }
})
```

#### Method: flush

Dump record from cache.

| Agument       | Type     | Default             | Description                                                     |
| ------------- | -------- | ------------------- | --------------------------------------------------------------- |
| opts.item     | Object   | N/A                 | The item to get fields to save.                                 |
| opts.logLevel | String   | [instance.logLevel] | Optional: Override the log level used for this invocation.      |
| cb            | Function | N/A                 | A callback function containing the result of the fetch.         |

__Example:__

```javascript
var params = {
    item: record,
    logLevel: state.get('logLevel')
};

table.flush(params, (err) => {
    if(err) { /* handle error */ }
})
```

#### Getter: tableName

Returns the name of the Dynamo Table.

__Example:__

```javascript
console.log(table.tableName);
// MyTable
```

#### Getter: indexes

Returns a list of indexes identified by the TableDescription when the chached
table instance was created.

__Example:__

```javascript
console.log(table.indexes);
// { ... }
```

### ServiceProxy

DEPRICATED. Do not use this method. The details of how to integrate common rpc
calls is still up in the air.
