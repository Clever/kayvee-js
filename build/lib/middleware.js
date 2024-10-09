/**
 * Module dependencies.
 * @private
 */
var fs = require("fs");
var path = require("path");
var kayvee = require("../lib/kayvee");
var KayveeLogger = require("../lib/logger/logger");
var morgan = require("morgan");
var _ = require("underscore");
/**
 * all relative files path in a directory
 */
function walkDirSync(dir, files = []) {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const f = path.join(dir, file);
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            walkDirSync(f, files);
        }
        else {
            files.push(f);
        }
    });
    return files.map((f) => path.relative(dir, f));
}
/**
 * returns a middleware function that checks if path exists in dir.
 *
 * Files in the directory are prefixed by base_path and compared to
 * req.path
 */
function skip_path(dir, base_path = "/") {
    let files = walkDirSync(dir);
    files = files.map((file) => path.join(base_path, file));
    console.error(`KayveeMiddleware: Skipping successful requests for files in ${dir} at ${base_path}`);
    return (req, res) => _(files).contains(req.path) && res.statusCode < 400;
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
    return `?${require("qs").stringify(parsedQueryString)}`;
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
    const statusCode = res.statusCode;
    let result;
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
    (req) => ({ method: req.method }),
    // Path (URL without query params)
    (req) => ({ path: getBaseUrl(req) }),
    // Query params
    (req) => ({ params: getQueryParams(req) }),
    // Response size
    (req, res) => ({ "response-size": getResponseSize(res) }),
    // Response time (ns)
    (req, res) => ({ "response-time": getResponseTimeNs(req, res) }),
    // Status code
    (req, res) => ({ "status-code": res.statusCode }),
    // Ip address
    (req) => ({ ip: getIp(req) }),
    // Via -- what library/code produced this log?
    () => ({ via: "kayvee-middleware" }),
    // Kayvee's reserved fields
    // Log level
    (req, res) => ({ level: getLogLevel(req, res) }),
    // Source -- which app emitted this log?
    // -> Gets passed in among `options` during library initialization
    // Title
    () => ({ title: "request-finished" }),
];
const defaultContextHandlers = [];
function handlerData(handlers, ...args) {
    const data = {};
    handlers.forEach((h) => {
        try {
            const handler_data = h(...args);
            _.extend(data, handler_data);
        }
        catch (e) {
            // ignore invalid handler
        }
    });
    return data;
}
class ContextLogger {
    constructor(logger, handlers, ...args) {
        this.logger = null;
        this.handlers = [];
        this.args = [];
        this.logger = logger;
        this.handlers = handlers;
        this.args = args;
    }
    _contextualData(data) {
        return _.extend(handlerData(this.handlers, ...this.args), data);
    }
}
for (const func of KayveeLogger.LEVELS) {
    ContextLogger.prototype[func] = function (title) {
        this[`${func}D`](title, {});
    };
    ContextLogger.prototype[`${func}D`] = function (title, data) {
        this.logger[`${func}D`](title, this._contextualData(data));
    };
}
for (const func of KayveeLogger.METRICS) {
    ContextLogger.prototype[func] = function (title, value) {
        this[`${func}D`](title, value, {});
    };
    ContextLogger.prototype[`${func}D`] = function (title, value, data) {
        this.logger[`${func}D`](title, value, this._contextualData(data));
    };
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
var formatLine = (options_arg) => {
    var options = options_arg || {};
    // `source` is the one required field
    if (!options.source) {
        throw Error("Missing required config for 'source' in Kayvee middleware 'options'");
    }
    const router = KayveeLogger.getGlobalRouter();
    return (tokens, req, res) => {
        // Build a dict of data to log
        var data = { _kvmeta: undefined }; // Adding _kvmeta here to make typescript compile happy
        // Add user-configured request headers
        var custom_headers = options.headers || [];
        var header_data = {};
        custom_headers.forEach((h) => {
            // Header field names are case insensitive, so let's be consistent
            var lc = h.toLowerCase();
            header_data[lc] = req.headers[lc];
        });
        _.extend(data, header_data);
        // Run user-configured handlers; add custom data
        var custom_handlers = options.handlers || [];
        // Allow user to override `base_handlers`; provide sane default set of handlers
        var base_handlers = options.base_handlers || defaultHandlers;
        base_handlers = base_handlers.concat([() => ({ source: options.source })]);
        // Execute custom-handlers THEN base-handlers
        const all_handlers = custom_handlers.concat(base_handlers);
        _.extend(data, handlerData(all_handlers, req, res));
        if (router) {
            data._kvmeta = router.route(data);
        }
        return kayvee.format(data);
    };
};
const defaultContextLoggerOpts = {
    enabled: true,
    handlers: defaultContextHandlers,
};
/**
 * Module exports.
 * @public
 */
if (process.env.NODE_ENV === "test") {
    module.exports = (clever_options, morgan_options = { skip: null }) => {
        if (clever_options.ignore_dir) {
            morgan_options.skip = skip_path(clever_options.ignore_dir.directory, clever_options.ignore_dir.path);
        }
        return morgan(formatLine(clever_options), morgan_options);
    };
    module.exports.ContextLogger = ContextLogger;
}
else {
    module.exports = (clever_options, context_logger_options = defaultContextLoggerOpts) => {
        // `source` is the one required field
        if (!clever_options.source) {
            throw new Error("Missing required config for 'source' in Kayvee middleware 'options'");
        }
        const logger = new KayveeLogger(clever_options.source);
        const morgan_options = {
            stream: process.stderr,
            skip: null,
        };
        if (clever_options.ignore_dir) {
            morgan_options.skip = skip_path(clever_options.ignore_dir.directory, clever_options.ignore_dir.path);
        }
        const morgan_logger = morgan(formatLine(clever_options), morgan_options);
        return (req, res, next) => {
            if (context_logger_options.enabled) {
                req.log = new ContextLogger(logger, context_logger_options.handlers, req);
            }
            morgan_logger(req, res, next);
        };
    };
}
