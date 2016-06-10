"use strict";

// Removes ":", heading/trailing / and replaces / by _ in a given route name
function sanitize(routeName) {
    return routeName.replace(/:/g, "").replace(/^\/|\/$/g, "").replace(/\//g, "_");
}

// extracts a route name from the request or response
function findRouteName(req, res) {
    // did we get a hardcoded name, or should we figure one out?
    if (res.locals && res.locals.statsdUrlKey)
        return res.locals.statsdUrlKey;

    if (req.route && req.route.path) {
        var routeName = req.route.path;

        if (Object.prototype.toString.call(routeName) === '[object RegExp]') {
            routeName = routeName.source;
        }

        if (routeName === '/') {
            routeName = 'root';
        }

        // Appends the HTTP method
        return req.method + '_' + sanitize(routeName);
    }
}

exports.router = function(prefix, options) {
    options = options || {};
    var timeByUrl = options.timeByUrl || false;
    var notFoundRouteName = options.notFoundRouteName || 'unknown_express_route';
    // var onResponseEnd = options.onResponseEnd || undefined;

    return function (req, res, next) {
        var startTime = new Date();

        // shadow end request
        var end = res.end;
        res.end = function (){
            end.apply(res, arguments);

            // response time counter
            var timingName = prefix + '.response_time';
            // time by URL?
            if (timeByUrl){
                timingName += '.';
                timingName += findRouteName(req, res) || notFoundRouteName;
            }
            statsd.timing(timingName, new Date() - startTime);

            // status code counter
            statsd.increment(prefix + '.response_code.' + res.statusCode);

            // if (onResponseEnd) {
            //     onResponseEnd(client, startTime, req, res);
            // }
        };
        next();
    };
};
