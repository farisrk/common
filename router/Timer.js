"use strict";

exports.router = function() {
    return(function(req, res, next) {
        req.headers.profile = "";
        // currently open timers
        req.timers = {};

        req.addTimer = function(name) {
            req.timers[name] = { startTime: (new Date()).getTime() };
        };

        req.closeTimer = function(name, comment) {
            if (Object.keys(req.timers).length && name && req.timers.hasOwnProperty(name)) {
                var lastTimer = req.timers[name];
                delete req.timers[name];
                var duration = (new Date()).getTime() - lastTimer.startTime;
                var desc = name + "(" + duration;
                if (comment) desc += " - " + comment;
                desc += ")";

                if (req.headers.profile) req.headers.profile += " ";
                req.headers.profile += desc;
            }
        };
        req.addTimer('fullRequest');

        next();
    });
};
