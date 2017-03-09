# RPC.Utils

Tools and utilities for use with RPC Services.

## Features

- Simplify RPC Development
- Supports consistent and predictable build patterns.
- Bubble up error handing for RPC Requests.
- Standardized formats for guids, dates, keys and more.
- Centralized user authentication handing.
- Common workflow interface.

For more details about each component, See [The Docs](/docs/README.md)
## Quickstart - Common

```bash
npm install --save git://github.com/nsnsolutions/RPC.Utils.git#v2.0.0
```

```javascript
// Include the package in your source.
const rpcUtils = require('rpc-utils');
```

## Quickstart - Helpers

```Javascript

// Generate a database-safe date.
rpcUtils.helpers.fmtDate(); // -> '2017-03-08T22:20:23.143Z'

// Convert a date string to a database-safe date.
rpcUtils.helpers.fmtDate('3/8/2017 10:20:23 PM'); // -> '2017-03-08T22:20:23.000Z'

// Generate a database-safe UUID.
rpcUtils.helpers.fmtUuid(); // -> 'beaff3379127435c881b50b66e072fd4'

// Convert a date string to a unix timestamp.
rpcUtils.helpers.fmtTimestamp('3/8/2017 10:20:23 PM'); // -> 1489011623

// Convert a Number to a hex value.

rpcUtils.helpers.toHex(42, 1); // -> '2A'

// Create a redis key to hold 'stuff' for Id 123 associated with Foo of type bar.
rpcUtils.helpers.computeRedisKey('MyService', 'Stuff', {Id: 123, Foo: "bar"});
// -> 'MyService:Stuff:Id=123:Foo=bar'
```

## Quickstart - DynamoDB

```javascript

// To create a DocumentClient that takes advantage of Caching
var params = {
    region: 'us-west-2',
    cache: {
        disableCache: false, // <- Pull from local config to disable for local-dev
        url: "redis://localhost/0",
        ttl: 86000
    }
}

var ddbClient = new rpcUtils.DynamoDB.DocumentClient(params);

// ddbClient can now be used exactly like AWS.DynamoDB.DocumentClient
```

```javascript
// Create a query from a filterBy to filter records with foo == bar.
var filters = rpcUtils.DynamoDB.FilterHelper.parseFilterString('foo:EQ:bar');
var fh = filterHelper({ TableName: 'MyTable' });

fh.addFilters(filters);

var params = fh.compileQuery();
ddbClient.query(params, (err, data) => {
    console.log(err, data);
});
```

## Quickstart - Workflows

```javascript

// Create and execute a workflow.

var workflow = {

    // Require at least level 10 access in JOB function
    authorizer: rpcUtils.Principal.Authorizers.with('JOB:10'),

    // Workflow Identification
    name: "My Workflow (v1)",
    code: "WRK01",

    // Workflow output
    logLevel: args.get('logLevel', _defaultLogLevel),
    repr: (o) => { return o.message || "Hello, World" },
    done: rpcDone,
};

// Add tasks to the workflow
workflow.tasks = [
    // function signatures should look like: (console, state, done)
    step1
    step2,
    step3, 
];

// identify required fields
workflow.required = [
    { field: 'name', type: String, regex: '^[a-zA-Z]{3,20}$' }
];

// Execute the workflow passing args as state.
rpcUtils.Workflow.Executor(workflow).run(args);
```

---

## More Information

Detailed information can be found for each component in [The
Docs](/docs/README.md).  There is a great deal of information and many features
behind each component. I earge you to read the documentation for a compnent
before moving past the above use cases.

## External Links

- [The RPC Framework](https://github.com/nsnsolutions/rpcfw)
- [RPC Tag Service](https://github.com/nsnsolutions/RPC.TagService)

--- 

<sup>
If you do not understand something, or if you find data to be incorrect, please
let [me](mailto://irlaird@gmail.com) know. I will be glad to help.
</sup>
