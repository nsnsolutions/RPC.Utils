'use strict'

const async = require('async');
const jsonic = require('jsonic');
const Consumer = require('sqs-consumer');

module.exports = function PubSubPlugin(opts) {

    /*
     * Add methods to seneca that offer publish and subscribe operations
     *
     * These functions are backed by AWS SNS and SQS.
     *
     * Opts:
     * - queuePrefix: A stage name to prefix to created queues.
     * - sqsClient: An AWS.SQS object.
     * - snsClient: An AWS.SNS object.
     *
     * Context:
     * - Context should be a seneca instance.
     *
     * Example:
     *   bus.add(PubSubPlugin, {
     *     queuePrefix: config.stageName,
     *     sqsClient: new AWS.SQS({region: opts.region}),
     *     snsClient: new AWS.SNS({region: opts.region})
     *   });
     *
     * This adds to methods to the seneca object (context).
     *
     * publish:
     * - Used to publish a message onto one or more SNS Topics.
     *
     * subscribe:
     * - Used to begin recieving messages published to one or more SNS Topics.
     */

    if(!opts.queuePrefix)
        throw new Error("Missing required option: queuePrefix");

    else if(!opts.sqsClient)
        throw new Error("Missing required option: sqsClient");

    else if(!opts.snsClient)
        throw new Error("Missing required option: snsClient");

    var seneca = this,
        queuePrefix = opts.queuePrefix,
        sqsClient = opts.sqsClient,
        snsClient = opts.snsClient;

    seneca.decorate('publish', publishToTopic);
    seneca.decorate('subscribe', createSubscription);

    return { name: "PubSubPlugin" };

    // ------------------------------------------------------------------------

    function publishToTopic() {

        /* 
         * Publish a message onto one or more SNS Topics.
         *
         * Arguments:
         * - pattern: A string or object containing details of the publish.
         *   - role: The role used to publish the data under (subject).
         *   - topic: The exact name or list of names of the SNS Topic(s) to publish to.
         *   - message: Optional: The payload of the message.
         *   - messageAttr: Optional: Used to set the message attributes.
         * - message: Optional: The payload of the message.
         * - callback: A function(err, result) to be called on completion
         *
         * Example:
         * seneca.publish("role:Important,topic:vfs_events", { message: "Hello" }, (err, result) => {
         *   if(err)
         *     throw err;
         *
         *   console.log(result);
         * });
         */

        var args = Array.prototype.slice.call(arguments),
            pattern = jsonic(args.shift()), // First Argument
            callback = args.pop(), // Last argument
            message = args.pop() || pattern.message, // Optional second argument.
            messageAttr = pattern.messageAttr || {};

        if(!message)
            throw new Error("Missing body.");

        else if(!pattern.role)
            throw new Error("Missing role.");

        else if(!pattern.topic)
            throw new Error("Missing topic(s).");

        var state = {
            role: pattern.role,
            topics: typeof pattern.topic === 'string' ? [ pattern.topic ] : pattern.topic,
            message: typeof message === 'string' ? message : JSON.stringify(message),
            messageAttr: pattern.messageAttr,
        };

        // Setup the task list.
        var tasks = [
            async.apply(declareTopics, state),
            async.apply(publishToTopics, state),
        ];

        // Post Message
        async.waterfall(tasks, (err) => callback(err, state.publishResults));
    }

    function createSubscription(pattern, handler) {

        /* 
         * Recieving messages published to one or more SNS Topics.
         *
         * Arguments:
         * - pattern: A string or object containing details of where to listen.
         *   - role: The role used in nameing the consumer queue.
         *   - topic: The exact name or list of names of the SNS Topic(s) to listen for events.
         *   - name: A name for the consumer queue.
         *   - queueAttr: Optional: Used to set the message attributes.
         * - Handler: A function that will be executed when a new message is recieved.
         *
         * Note:
         * - Consumer queue is generated using the following pattern:
         *   :  ${opts.queuePrefix.toUpperCase()}${pattern.role}-${pattern.name}
         *
         * Example:
         * seneca.subscribe("role:myService,topic:vfs_events,name:vfs_events", (msg, done) => {
         *   console.log(msg);
         *   done();
         * });
         */

        // Normalize the pattern.
        pattern = jsonic(pattern);
        pattern.queueAttr = pattern.queueAttr || {};

        // If fifo, append attributes.
        if(pattern.name.endsWith('.fifo')) {
            throw new Error("Fifo's are not currently supported!");
            pattern.queueAttr.FifoQueue = 'true';
        }

        // Create a state object that can be passed between tasks.
        var state = {
            consumerHandle: null,
            queueAttr: pattern.queueAttr,
            queueName: `${opts.queuePrefix.toUpperCase()}${pattern.role}-${pattern.name}`,
            topics: typeof pattern.topic === 'string' ? [ pattern.topic ] : pattern.topic
        };

        // Setup the task list.
        var tasks = [
            async.apply(declareQueue, state),
            async.apply(declareTopics, state),
            async.apply(applyPolicy, state),
            async.apply(subscribeQueue, state)
        ];

        // Create the subscription.
        async.waterfall(tasks, (err) => {

            if(err) throw err;

            // BBC's SQS Consumer object.
            state.consumerHandle = Consumer.create({
                queueUrl: state.queueUrl,
                handleMessage: (msg, cb) => {
                    let body;
                    try { body = JSON.parse(msg.Body); }
                    catch (e) { return done(e); }
                    handler(body, cb);
                }
            });

            // Start/Stop when seneca is ready/shutdown
            seneca.ready(() => state.consumerHandle.start());
            seneca.on('close', () => state.consumerHandle.stop());
        })
    }

    function declareQueue(state, done) {

        var params = {
            QueueName: state.queueName,
            Attributes: state.queueAttr
        };

        sqsClient.createQueue(params, (err, qInfo) => {

            if(err)
                throw err;

            state.queueUrl = qInfo.QueueUrl;

            var params = {
                QueueUrl: qInfo.QueueUrl,
                AttributeNames: [ 'QueueArn' ]
            };

            opts.sqsClient.getQueueAttributes(params, (err, qDetail) => {

                if(err)
                    throw err;

                state.queueArn = qDetail.Attributes.QueueArn;

                done();
            });
        });
    }

    function declareTopics(state, done) {

        state.topicArns = [];

        async.each(state.topics, (name, next) => {

            var params = { Name: name };

            opts.snsClient.createTopic(params, (err, xInfo) => {
                state.topicArns.push(xInfo.TopicArn);
                next(err);
            });

        }, done);
    }

    function applyPolicy(state, done) {

        var policy = { Statement: [] };

        var addTopicStatement = (topicArn, next) => { 
            policy.Statement.push({
                Effect: "Allow",
                Principal: "*",
                Action: "SQS:SendMessage",
                Resource: state.queueArn,
                Condition: { 
                    ArnEquals: { "aws:SourceArn": topicArn } 
                }
            });
            next();
        }

        async.each(state.topicArns, addTopicStatement, (err) => {
            if(err)
                return next(err);

            var params = {
                QueueUrl: state.queueUrl,
                Attributes: { Policy: JSON.stringify(policy) }
            };

            opts.sqsClient.setQueueAttributes(params, (err) => done(err));
        });
    }

    function subscribeQueue(state, done) {

        async.each(state.topicArns, (topicArn, next) => {

            var params = {
                Protocol: 'sqs',
                TopicArn: topicArn,
                Endpoint: state.queueArn
            };

            snsClient.subscribe(params, (err) => next(err));

        }, done);
    }

    function publishToTopics(state, done) {

        state.publishResults = [];

        async.each(state.topicArns, (arn, next) => {

            var params = {
                Message: state.message,
                MessageAttributes: state.messageAttr,
                Subject: state.role,
                TopicArn: arn
            };

            opts.snsClient.publish(params, (err, resp) => {
                state.publishResults.push(resp);
                next(err);
            });

        }, done);
    }
};
