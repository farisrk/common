"use strict";

var async = require('async');
var mysql_client = require('mysql');
var Log = global.logger.database;

var connection_cache = {};
var staticFunc = exports.MySQL = {
    load: (config, callback) => {
        async.forEachSeries(config, (connection, next) => {
            var name = connection.name;
            if (connection_cache.hasOwnProperty(name))
                return next(new Error('MySQL connection ' + name + ' already exists'));

            connection_cache[name] = mysql_client.createPool({
                host: connection.host,
                user: connection.user,
                password: connection.pwd,
                database: connection.database,
                insecureAuth: true
            });

            return next();
        }, (err) => {
            if (!err) Log.debug('[MySQLClient::load] Successfully connected to MySQL', { connections: config });
            return callback(err);
        });
    },
    getConnection: (name, callback) => {
        if (!connection_cache.hasOwnProperty(name))
            return callback(new Error('Requested connection does not exist'));
        connection_cache[name].getConnection(callback);
    },
    getConnections: () => {
        return connection_cache;
    },
    doQuery: (options, callback) => {
        // options example:
        // {
        //     ns: 'model::function', connection: 'connection_name',
        //     sql: 'SELECT * FROM foo WHERE id = ? AND appId = ?',
        //     values: [4, 2], timeout: 10000,
        // }
        // another example of set values using an object
        // var post  = { id: 1, title: 'Hello MySQL' };
        // var query = connection.query('INSERT INTO posts SET ?', post, callback);
        // result sql: INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'

        try {
            // TODO: profile the query
            staticFunc.getConnection(options.connection, (err, connection) => {
                if (err) return callback(err);

                var sqlStr = connection.query(options, (err, result, fields) => {
                    connection.release();

                    var logLevel = 'debug';
                    var logMessage = util.format('[%s] : Query', options.ns);
                    if (err) {
                        logLevel = 'error';
                        options.error = err;
                    } else {
                        options.result = result;
                    }
                    Log.log(logLevel, logMessage, options);

                    return callback(err, result, fields);
                });
            });
        } catch(err) {
            Log.error('[MySQLClient::doQuery] Error occurred during mongo query', {
                error: err.message,
                trace: err.stack,
                data: options
            });
            return callback(err);
        }
    }
};
