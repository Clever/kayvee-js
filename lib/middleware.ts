"use strict";

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

var getBaseUrl = function (req) {
  var url = req.originalUrl || req.url;
  var parsed = require("url").parse(url, true);
  return parsed.pathname;
};

/**
 * request query params
 */

var getQueryParams = function (req) {
  var url = req.originalUrl || req.url;
  var parsed = require("url").parse(url, true);
  return parsed.search;
};

/**
 * response size
 */

var getResponseSize = function (res) {
  var headers = res.headers || res._headers;
  if (headers && headers["content-length"]) {
    return Number(headers["content-length"]);
  } else if (res.data) {
    return res.data.length;
  }
};

/**
 * response time in nanoseconds
 */

var getResponseTimeNs = function (req, res) {
  if (!req._startAt || !res._startAt) {
    // missing request and/or response start time
    return;
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

var cleverFormatLine = function (options) {
  options = options || {};

  return function (tokens, req, res) {
    // Build a dict of data to log
    var data = {};

    // Add user-configured request headers
    var custom_headers = options.headers || [];
    var header_data = {};
    custom_headers.forEach(function (h) {
      header_data[h] = req.headers[h];
    });
    _.extend(data, header_data);

    // Run user-configured handlers; add custom data
    var custom_handlers = options.handlers || [];
    custom_handlers.forEach(function (h) {
      try {
        var handler_data = h(req, res);
        _.extend(data, handler_data);
      } catch (e) {
        // ignore invalid handler
      }
    });

    // Add default request fields
    var default_data = {
      "method": req.method,
      "path": getBaseUrl(req),
      "params": getQueryParams(req),
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

module.exports = function (clever_options, morgan_options) {
  return morgan(cleverFormatLine(clever_options), morgan_options);
};
