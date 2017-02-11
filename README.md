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
