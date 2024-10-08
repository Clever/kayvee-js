/**
 * Module dependencies.
 * @private
 */
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var fs = require("fs");
var path = require("path");
var kayvee = require("../lib/kayvee");
var KayveeLogger = require("../lib/logger/logger");
var morgan = require("morgan");
var _ = require("underscore");
/**
 * all relative files path in a directory
 */
function walkDirSync(dir, files) {
    if (files === void 0) { files = []; }
    var list = fs.readdirSync(dir);
    list.forEach(function (file) {
        var f = path.join(dir, file);
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            walkDirSync(f, files);
        }
        else {
            files.push(f);
        }
    });
    return files.map(function (f) { return path.relative(dir, f); });
}
/**
 * returns a middleware function that checks if path exists in dir.
 *
 * Files in the directory are prefixed by base_path and compared to
 * req.path
 */
function skip_path(dir, base_path) {
    if (base_path === void 0) { base_path = "/"; }
    var files = walkDirSync(dir);
    files = files.map(function (file) { return path.join(base_path, file); });
    console.error("KayveeMiddleware: Skipping successful requests for files in " + dir + " at " + base_path);
    return function (req, res) { return _(files).contains(req.path) && res.statusCode < 400; };
}
/**
 * request path
 */
function getBaseUrl(req) {
    var url = req.originalUrl || req.url;
    var parsed = require("url").parse(url, true);
    return parsed.pathname;
}
/**
 * request query params
 */
function getQueryParams(req) {
    var url = req.originalUrl || req.url;
    var parsed = require("url").parse(url, true);
    var parsedQueryString = require("qs").parse(parsed.search, {
        allowPrototypes: false,
        ignoreQueryPrefix: true,
    });
    return "?" + require("qs").stringify(parsedQueryString);
}
/**
 * response size
 */
function getResponseSize(res) {
    var result = undefined;
    var headers = res.headers || res._headers;
    if (headers && headers["content-length"]) {
        result = Number(headers["content-length"]);
    }
    else if (res.data) {
        result = res.data.length;
    }
    return result;
}
/**
 * response time in nanoseconds
 */
function getResponseTimeNs(req, res) {
    if (!req._startAt || !res._startAt) {
        // missing request and/or response start time
        return undefined;
    }
    // calculate diff
    var ns = (res._startAt[0] - req._startAt[0]) * 1e9 + (res._startAt[1] - req._startAt[1]);
    return ns;
}
/**
 * IP address that sent the request.
 *
 * `req.ip` is defined in Express: http://expressjs.com/en/api.html#req.ip
 */
function getIp(req) {
    var remoteAddress = req.connection ? req.connection.remoteAddress : undefined;
    return req.ip || remoteAddress;
}
/**
 * Log level
 */
function getLogLevel(req, res) {
    var statusCode = res.statusCode;
    var result;
    if (statusCode >= 499) {
        result = KayveeLogger.Error;
    }
    else {
        result = KayveeLogger.Info;
    }
    return result;
}
/*
 * Default handlers
 */
var defaultHandlers = [
    // Request method
    function (req) { return ({ method: req.method }); },
    // Path (URL without query params)
    function (req) { return ({ path: getBaseUrl(req) }); },
    // Query params
    function (req) { return ({ params: getQueryParams(req) }); },
    // Response size
    function (req, res) { return ({ "response-size": getResponseSize(res) }); },
    // Response time (ns)
    function (req, res) { return ({ "response-time": getResponseTimeNs(req, res) }); },
    // Status code
    function (req, res) { return ({ "status-code": res.statusCode }); },
    // Ip address
    function (req) { return ({ ip: getIp(req) }); },
    // Via -- what library/code produced this log?
    function () { return ({ via: "kayvee-middleware" }); },
    // Kayvee's reserved fields
    // Log level
    function (req, res) { return ({ level: getLogLevel(req, res) }); },
    // Source -- which app emitted this log?
    // -> Gets passed in among `options` during library initialization
    // Title
    function () { return ({ title: "request-finished" }); },
];
var defaultContextHandlers = [];
function handlerData(handlers) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var data = {};
    handlers.forEach(function (h) {
        try {
            var handler_data = h.apply(void 0, args);
            _.extend(data, handler_data);
        }
        catch (e) {
            // ignore invalid handler
        }
    });
    return data;
}
var ContextLogger = /** @class */ (function () {
    function ContextLogger(logger, handlers) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        this.logger = null;
        this.handlers = [];
        this.args = [];
        this.logger = logger;
        this.handlers = handlers;
        this.args = args;
    }
    ContextLogger.prototype._contextualData = function (data) {
        return _.extend(handlerData.apply(void 0, __spreadArrays([this.handlers], this.args)), data);
    };
    return ContextLogger;
}());
var _loop_1 = function (func) {
    ContextLogger.prototype[func] = function (title) {
        this[func + "D"](title, {});
    };
    ContextLogger.prototype[func + "D"] = function (title, data) {
        this.logger[func + "D"](title, this._contextualData(data));
    };
};
for (var _i = 0, _a = KayveeLogger.LEVELS; _i < _a.length; _i++) {
    var func = _a[_i];
    _loop_1(func);
}
var _loop_2 = function (func) {
    ContextLogger.prototype[func] = function (title, value) {
        this[func + "D"](title, value, {});
    };
    ContextLogger.prototype[func + "D"] = function (title, value, data) {
        this.logger[func + "D"](title, value, this._contextualData(data));
    };
};
for (var _b = 0, _c = KayveeLogger.METRICS; _b < _c.length; _b++) {
    var func = _c[_b];
    _loop_2(func);
}
/*
 * User configuration is passed via an `options` object.
 * Results from configuration are prioritized such that (`base_handlers` > `handlers` > `headers`).
 *
 * // `headers` - logs these request headers, if they exist
 *
 * headers: e.g. ['X-Request-Id', 'Host']
 *
 * // `handlers` - an array of functions of that return dicts to be logged.
 *
 * handlers: e.g. [function(request, response) { return {"key":"val"}]
 *
 * // `base_handlers` - an array of functions of that return dicts to be logged.
 * // Barring exceptional circumstances, `base_handlers` should not be overriden by the user.
 * // `base_handlers` defaults to a core set of handlers to run... see `defaultHandlers`.
 * //
 * // Separating `base_handlers` from `handlers` is done to ensure that reserved keys
 * // don't accidentally get overriden by custom handlers. This can now only happen if
 * // the user explicitly overrides `base_handlers`.
 *
 * base_handlers: e.g. [function(request, response) { return {"key":"val"}]
 *
 */
var formatLine = function (options_arg) {
    var options = options_arg || {};
    // `source` is the one required field
    if (!options.source) {
        throw Error("Missing required config for 'source' in Kayvee middleware 'options'");
    }
    var router = KayveeLogger.getGlobalRouter();
    return function (tokens, req, res) {
        // Build a dict of data to log
        var data = { _kvmeta: undefined }; // Adding _kvmeta here to make typescript compile happy
        // Add user-configured request headers
        var custom_headers = options.headers || [];
        var header_data = {};
        custom_headers.forEach(function (h) {
            // Header field names are case insensitive, so let's be consistent
            var lc = h.toLowerCase();
            header_data[lc] = req.headers[lc];
        });
        _.extend(data, header_data);
        // Run user-configured handlers; add custom data
        var custom_handlers = options.handlers || [];
        // Allow user to override `base_handlers`; provide sane default set of handlers
        var base_handlers = options.base_handlers || defaultHandlers;
        base_handlers = base_handlers.concat([function () { return ({ source: options.source }); }]);
        // Execute custom-handlers THEN base-handlers
        var all_handlers = custom_handlers.concat(base_handlers);
        _.extend(data, handlerData(all_handlers, req, res));
        if (router) {
            data._kvmeta = router.route(data);
        }
        return kayvee.format(data);
    };
};
var defaultContextLoggerOpts = {
    enabled: true,
    handlers: defaultContextHandlers,
};
/**
 * Module exports.
 * @public
 */
if (process.env.NODE_ENV === "test") {
    module.exports = function (clever_options, morgan_options) {
        if (morgan_options === void 0) { morgan_options = { skip: null }; }
        if (clever_options.ignore_dir) {
            morgan_options.skip = skip_path(clever_options.ignore_dir.directory, clever_options.ignore_dir.path);
        }
        return morgan(formatLine(clever_options), morgan_options);
    };
    module.exports.ContextLogger = ContextLogger;
}
else {
    module.exports = function (clever_options, context_logger_options) {
        if (context_logger_options === void 0) { context_logger_options = defaultContextLoggerOpts; }
        // `source` is the one required field
        if (!clever_options.source) {
            throw new Error("Missing required config for 'source' in Kayvee middleware 'options'");
        }
        var logger = new KayveeLogger(clever_options.source);
        var morgan_options = {
            stream: process.stderr,
            skip: null,
        };
        if (clever_options.ignore_dir) {
            morgan_options.skip = skip_path(clever_options.ignore_dir.directory, clever_options.ignore_dir.path);
        }
        var morgan_logger = morgan(formatLine(clever_options), morgan_options);
        return function (req, res, next) {
            if (context_logger_options.enabled) {
                req.log = new ContextLogger(logger, context_logger_options.handlers, req);
            }
            morgan_logger(req, res, next);
        };
    };
}
