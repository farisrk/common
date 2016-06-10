"use strict";

var async = require('async');
var redis_client = require('redis');
var Log = global.logger.database;

var connection_cache = {};
var staticFunc = exports.Redis = {
    load: (config, callback) => {
        async.forEachSeries(config, (connection, next) => {
            var name = connection.name;
            if (connection_cache.hasOwnProperty(name))
                return next(new Error("Redis connection '" + name + "' already exists"));

            if (!'retry_delay' in connection)
                connection.retry_delay = 3000;
            if (!'connect_timeout' in connection)
                connection.connect_timeout = 300000;
            connection.retry_strategy = (options) => {
                // {
                //   "attempt": 2,
                //   "error": {
                //     "code": "ENOTFOUND",
                //     "errno": "ENOTFOUND",
                //     "syscall": "getaddrinfo",
                //     "hostname": "pub-redis-18816.us-east-1-4.6.ec2.redislabs.com",
                //     "host": "pub-redis-18816.us-east-1-4.6.ec2.redislabs.com",
                //     "port": 18816
                //   },
                //   "total_retry_time": 200,
                //   "times_connected": 0
                // }
                if (options.total_retry_time > connection.connect_timeout)
                    return;
                return Math.min(options.attempt * 200, connection.retry_delay);
            };
            var client = redis_client.createClient(connection);
            client.on('error', (err) => {
                Log.error('[Redis::load] Redis client connection error', {
                    error: err.message,
                    trace: err.stack,
                    connection: connection
                });
                throw err;
                // {
                //   "message": "Redis connection to pub-redis-18816.us-east-1-4.6.ec2.redislabs.com:18816 failed - getaddrinfo ENOTFOUND pub-redis-18816.us-east-1-4.6.ec2.redislabs.com pub-redis-18816.us-east-1-4.6.ec2.redislabs.com:18816",
                //   "trace": "Error: Redis connection to pub-redis-18816.us-east-1-4.6.ec2.redislabs.com:18816 failed - getaddrinfo ENOTFOUND pub-redis-18816.us-east-1-4.6.ec2.redislabs.com pub-redis-18816.us-east-1-4.6.ec2.redislabs.com:18816\n    at errnoException (dns.js:26:10)\n    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:77:26)",
                //   "connection": {
                //     "name": "test",
                //     "host": "pub-redis-18816.us-east-1-4.6.ec2.redislabs.com",
                //     "port": 18816
                //   }
                // }
                // {
                //   "message": "Redis connection in broken state: connection timeout exceeded.",
                //   "trace": "Error: Redis connection in broken state: connection timeout exceeded.\n    at RedisClient.connection_gone (/home/main/portfel/node_modules/redis/index.js:574:17)\n    at RedisClient.on_error (/home/main/portfel/node_modules/redis/index.js:344:10)\n    at Socket.<anonymous> (/home/main/portfel/node_modules/redis/index.js:227:14)\n    at emitOne (events.js:77:13)\n    at Socket.emit (events.js:169:7)\n    at connectErrorNT (net.js:998:8)\n    at nextTickCallbackWith2Args (node.js:441:9)\n    at process._tickCallback (node.js:355:17)",
                //   "connection": {
                //     "name": "test",
                //     "host": "pub-redis-18816.us-east-1-4.6.ec2.redislabs.com",
                //     "port": 18816
                //   }
                // }
            }).on('reconnecting', (obj) => {
                // {
                //   "delay": 400,
                //   "attempt": 2,
                //   "error": {
                //     "code": "ENOTFOUND",
                //     "errno": "ENOTFOUND",
                //     "syscall": "getaddrinfo",
                //     "hostname": "pub-redis-18816.us-east-1-4.6.ec2.redislabs.com",
                //     "host": "pub-redis-18816.us-east-1-4.6.ec2.redislabs.com",
                //     "port": 18816
                //   },
                //   "times_connected": 0,
                //   "total_retry_time": 200
                // }
                Log.info('[Redis::load] Trying to reconnect to Redis server: ' + name + '. Attempts: ' + obj.attempt);
            }).on('connect', () => {
                Log.info('[Redis::load] Connected to Redis server: ' + name);
            });
            connection_cache[name] = client;

            return next();
        }, (err) => {
            if (!err) Log.debug('[Redis::load] Successfully connected to Redis', { connections: config });
            return callback(err);
        });
    },
    getConnection: (name) => {
        if (!connection_cache.hasOwnProperty(name))
            throw new Error('Requested connection does not exist');
        return connection_cache[name];
    },
    getConnections: () => {
        return connection_cache;
    },
    doQuery: (options, callback) => {
        try {
            var operation = '_' + options.op;
            delete options.op;

            // TODO: profile the query
            var connection = staticFunc.getConnection(options.connection);
            redisOperations[operation](connection, options, (err, res) => {
                // fuck you javascript/redis library... one of you fucked up!
                if (typeof res === 'string' && res === 'undefined') res = undefined;

                var logLevel = 'info';
                var logMessage = util.format('[%s] : %s', options['ns'], operation);
                if (err) {
                    logLevel = 'error';
                    options.error = err;
                } else {
                    options.result = res;
                }
                Log.log(logLevel, logMessage, options);

                return callback(err, res);
            });
        } catch(err) {
            Log.error('[RedisClient::doQuery] Error occurred during mongo query', {
                error: err.message,
                trace: err.stack,
                data: options
            });
            return callback(err);
        }
    }
};

var redisOperations = {
    _get: (connection, options, callback) => {
        connection.get(options.key, callback);
    },
    _set: (connection, options, callback) => {
        console.log('redis set options:', options);
        connection.set(options.key, options.value, (err) => {
            callback(err);
            if (!err && options.hasOwnProperty('ttl'))
                connection.expire(options.key, options.ttl);
        });
    }
}
