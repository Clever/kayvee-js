/**
 * Module dependencies.
 * @private
 */

var kayvee = require("../lib/kayvee");
var kayveeLogger = require("../lib/logger/logger");
var morgan = require("morgan");
var _ = require("underscore");

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
  return parsed.search;
}

/**
 * response size
 */

function getResponseSize(res) {
  var result = undefined;
  var headers = res.headers || res._headers;
  if (headers && headers["content-length"]) {
    result = Number(headers["content-length"]);
  } else if (res.data) {
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
  var ns = (res._startAt[0] - req._startAt[0]) * 1e9
    + (res._startAt[1] - req._startAt[1]);
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
  if (statusCode >= 500) {
    result = kayveeLogger.Error;
  } else if (statusCode >= 400) {
    result = kayveeLogger.Warning;
  } else {
    result = kayveeLogger.Info;
  }
  return result;
}

/*
 * Default handlers
 */
var defaultHandlers = [
  // Request method
  (req) => ({method: req.method}),
  // Path (URL without query params)
  (req) => ({path: getBaseUrl(req)}),
  // Query params
  (req) => ({params: getQueryParams(req)}),
  // Response size
  (req, res) => ({"response-size": getResponseSize(res)}),
  // Response time (ns)
  (req, res) => ({"response-time": getResponseTimeNs(req, res)}),
  // Status code
  (req, res) => ({"status-code": res.statusCode}),
  // Ip address
  (req) => ({ip: getIp(req)}),

  // Kayvee's reserved fields
  // Log level
  (req, res) => ({level: getLogLevel(req, res)}),
  // Source
  // -> Gets passed in among `options` during library initialization
  // Title
  () => ({title: "request-info"}),
];

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
    throw (Error("Missing required config for 'source' in Kayvee middleware 'options'"));
  }

  return (tokens, req, res) => {
    // Build a dict of data to log
    var data = {};

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
    base_handlers = base_handlers.concat([() => ({source: options.source})]);

    // Execute custom-handlers THEN base-handlers
    var all_handlers = custom_handlers.concat(base_handlers);
    all_handlers.forEach((h) => {
      try {
        var handler_data = h(req, res);
        _.extend(data, handler_data);
      } catch (e) {
        // ignore invalid handler
      }
    });

    return kayvee.format(data);
  };
};

/**
 * Module exports.
 * @public
 */

if (process.env.NODE_ENV === "test") {
  module.exports = (clever_options, morgan_options) => morgan(formatLine(clever_options), morgan_options);
} else {
  module.exports = (clever_options) => morgan(formatLine(clever_options), {stream: process.stderr});
}
