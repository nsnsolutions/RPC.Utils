[Back To Plugins](/docs/Plugins.md)

# Publish Subscribe Plugin

Add methods to seneca that offer publish and subscribe operations. These
functions are backed by AWS SNS and SQS.

## Features

* Listen to Topic Exchange for new messages
* Publish message to Topic Exchange
* Create exchanges automaticly if they do not exit.
* Created role based consumer queues that can be shared between multiple
  instances of your service.

## Quickstart

### Install the Plugin

Add the plugin to your service's bootstrap.

```javascript

function boostrap(bus, config) {

    bus.add(PubSubPlugin, {
        queuePrefix: config.shared.stageName,
        sqsClient: new AWS.SQS({region: config.shared.region}),
        snsClient: new AWS.SNS({region: config.shared.region})
    });
    
    bus.rpcClient({ pin: "role:*" });
    bus.rpcServer({ pin: [ "role:myService" ]});
}
```

### Add a Consumer Hander

Create a plugin for your service that handles messages on a specific Topic.

```javascript
'use strict';

const rpcUtils = require('rpc-utils');

module.exports = function MyPlugin(opts) {

    var seneca = this;

    seneca.subscribe('role:myService,name:someTask,topic:tasks', handleTasks);

    return { name: 'MyPlugin' };

    // ------------------------------------------------------------------------

    function handleTasks(args, psDone) {

        console.log("Received task:," args);

        /* 
         * Do some work 
         */

        psDone();
    }
}
```

Add your plugin to your seneca service.

```javascript

function boostrap(bus, config) {

    // Install the pub sub plugin.
    bus.add(PubSubPlugin, {
        queuePrefix: config.shared.stageName,
        sqsClient: new AWS.SQS({region: config.shared.region}),
        snsClient: new AWS.SNS({region: config.shared.region})
    });

    // Register your new service plugin hander.
    bus.add(MyPlugin, { /* Optional config here */ });

    // Connect to the RPC bus incase any of your methods needs to interact with other services. (Optional)
    bus.rpcClient({ pin: "role:*" });
    bus.rpcServer({ pin: [ "role:myService" ]});
}
```

## API

### PubSubPlugin

Add methods to seneca that offer publish and subscribe operations. These
functions are backed by AWS SNS and SQS.

_Note: It is important that the execution context of class has a method named
'decorate' that can be used to extend the class. It is expected that this
context will be a seneca instance object._

This plugin will add 2 new methods to the seneca object.

1. [publish](publish) - Used to publish new messages onto an SNS Topic.
2. [subscribe](subscribe) - Used to receive messages from an SNS Topic.

__Options__

| Name | Type | Description |
| ---- | ---- | ----------- |
| queuePrefix | String | A stage unique name used to prefix newly created consumer queues. |
| sqsClient | AWS.SQS | An aws-sdk.SQS Object used to interact with Amazon SQS. |
| snsClient | AWS.SNS | An aws-sdk.SNS Object used to interact with Amazon SNS. |

### seneca.publish

Publish a message onto one or more SNS Topics.

__Arguments__

| Name | Type | Description |
| ---- | ---- | ----------- |
| pattern | jSonicString or Object | A jSonic string or object containing the following parameters. |
| pattern.role | String | The role used to publish the data under (subject). |
| pattern.topic | String | The exact name or an array of exact names of the SNS Topic or topics on which to publish. |
| pattern.message | String or Object | Optional: The payload of the message. |
| pattern.messageAttr | Object | Optional: Used to set additional message attributes. |
| message | String or Object | Optional: The payload of the message. |
| callback | Callback Function | The function to be called on completion. |

### seneca.subscribe

Recieving messages published to one or more SNS Topics.

__Arguments__
| Name | Type | Description |
| ---- | ---- | ----------- |
| pattern | jSonicString or Object | A jSonic string or object containing the following parameters. |
| pattern.role | String | The name of the service or dataset associated with this consumer. This name is used in the creation of the consumer queue. |
| pattern.topic | String | The exact name or an array of exact names of the SNS Topic or topics to monitor. |
| pattern.name | String | The service unique name of the consumer queue. |
| pattern.queueAttr | Object | Any additional attributes to pass to the consumer queue. |
| handler | Callback Function | The function to call when a new message is received. |

_Note: Consumer queue is generated using the following pattern: `${opts.queuePrefix.toUpperCase()}${pattern.role}-${pattern.name}`_

[Back To Plugins](/docs/Plugins.md)
