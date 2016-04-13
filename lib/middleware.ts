/**
 * Module dependencies.
 * @private
 */

var kayvee = require("../lib/kayvee");
var morgan = require("morgan");
var _ = require("underscore");

/**
 * request path
 */

var getBaseUrl = function getBaseUrl(req) {
  var url = req.originalUrl || req.url;
  var parsed = require("url").parse(url, true);
  return parsed.pathname;
};

/**
 * request query params
 */

var getQueryParams = function getQueryParams(req) {
  var url = req.originalUrl || req.url;
  var parsed = require("url").parse(url, true);
  return parsed.search;
};

/**
 * response size
 */

var getResponseSize = function getResponseSize(res) {
  var result = undefined;
  var headers = res.headers || res._headers;
  if (headers && headers["content-length"]) {
    result = Number(headers["content-length"]);
  } else if (res.data) {
    result = res.data.length;
  }
  return result;
};

/**
 * response time in nanoseconds
 */

var getResponseTimeNs = function getResponseTimeNs(req, res) {
  if (!req._startAt || !res._startAt) {
    // missing request and/or response start time
    return undefined;
  }

  // calculate diff
  var ns = (res._startAt[0] - req._startAt[0]) * 1e9
    + (res._startAt[1] - req._startAt[1]);
  return ns;
};

/*
 * User configuration is passed via an `options` object.
 *
 * // `headers` - logs these request headers, if they exist
 * headers: e.g. ['X-Request-Id', 'Host']
 *
 * // `handlers` - an array of functions of that return dicts to be logged.
 * handlers: e.g. [function(request, response) { return {"key":"val"}]
 */

var formatLine = (options_arg) => {
  var options = options_arg || {};

  return (tokens, req, res) => {
    // Build a dict of data to log
    var data = {};

    // Add user-configured request headers
    var custom_headers = options.headers || [];
    var header_data = {};
    custom_headers.forEach((h) => {
      header_data[h] = req.headers[h];
    });
    _.extend(data, header_data);

    // Run user-configured handlers; add custom data
    var custom_handlers = options.handlers || [];
    custom_handlers.forEach((h) => {
      try {
        var handler_data = h(req, res);
        // TODO: reject anything that's not an object
        _.extend(data, handler_data);
      } catch (e) {
        // ignore invalid handler
      }
    });

    // Add default request fields
    var default_data = {
      method: req.method,
      path: getBaseUrl(req),
      params: getQueryParams(req),
      "response-size": getResponseSize(res),
      "response-time": getResponseTimeNs(req, res),
      "status-code": res.statusCode,
      "x-forwarded-for": req.headers["x-forwarded-for"],
    };
    _.extend(data, default_data);

    return kayvee.format(data);
  };
};

/**
 * Module exports.
 * @public
 */

module.exports = (clever_options, morgan_options) => morgan(formatLine(clever_options), morgan_options);
