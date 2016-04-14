var assert = require("assert");
var express = require("express");
var http = require("http");
var request = require("supertest");
var split = require("split");
var _ = require("underscore");
var kayvee = require("../lib/kayvee");
var kv_middleware = require("../lib/middleware");

/*
 * Helpers copied from expressjs/morgan
 * https://github.com/expressjs/morgan/blob/master/test/morgan.js#L1332-L1380
 *
 * Modified `createServer`, since we are always testing Kayvee middleware here.
 * Renamed `after` -> `afterTest`; preventing typescript errors from overloading a Mocha function.
 */
function afterTest(count, callback) {
  var args = new Array(3);
  var i = 0;

  return (err, arg1, arg2) => {
    assert.ok(i++ < count, `callback called ${count} times`);

    args[0] = args[0] || err;
    args[1] = args[1] || arg1;
    args[2] = args[2] || arg2;

    if (count === i) {
      callback.apply(null, args);
    }
  };
}

function createLineStream(callback) {
  return split().on("data", callback);
}

function noopMiddleware(req, res, next) {
  next();
}

function createServer(server_type, clever_options, morgan_options, fn) {
  var logger = kv_middleware(clever_options, morgan_options);
  var middle = fn || noopMiddleware;

  var server = null;
  if (server_type === "http") {
    server = http.createServer((req, res) => {
      logger(req, res, (err) => {
        // allow req, res alterations
        middle(req, res, () => {
          if (err) {
            res.statusCode = 500;
            res.end(err.message);
          }

          res.setHeader("X-Sent", "true");
          res.setHeader("Content-Length", 12345);
          res.end((req.connection && req.connection.remoteAddress) || "-");
        });
      });
    });
  } else if (server_type === "express") {
    var app = express();
    app.use(logger);
    app.get("*", (req, res) => {
      res.header("Content-Length", 12345);
      res.end();
    });

    server = app;
  } else {
    throw (new Error(`unknown server type: ${server_type}`));
  }

  return server;
}

_.each(["http", "express"], (serverType) => {
  describe(`middleware for *${serverType}* server`, () => {
    it("should pass default fields", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) { return done(err); }
        var masked = line.replace(/response-time":\d+/, 'response-time":99999');
        const expected = kayvee.format({
          method: "GET",
          path: "/hello/world",
          params: "?a=1&b=2",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          level: "info",
        });
        assert.equal(masked, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = undefined;

      var server = createServer(serverType, options, {stream}, (req, res, next) => {
        res.setHeader("some-header", "some-header-value");
        next();
      });

      request(server)
      .get("/hello/world?a=1&b=2")
      .expect(200, cb);
    });

    it("should allow logging user-specified request headers", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) { return done(err); }
        var masked = line.replace(/response-time":\d+/, 'response-time":99999');
        const expected = kayvee.format({
          "some-header": "some-header-value",
          "another-header": "another-header-value",
          method: "GET",
          path: "/hello/world",
          params: "?a=1&b=2",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          level: "info",
        });
        assert.equal(masked, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        headers: ["some-header", "another-header"],
      };

      var server = createServer(serverType, options, {stream}, (req, res, next) => {
        next();
      });

      request(server)
      .get("/hello/world?a=1&b=2")
      .set("some-header", "some-header-value")
      .set("another-header", "another-header-value")
      .expect(200, cb);
    });

    it("should allow logging from user-specified handlers", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) { return done(err); }
        var masked = line.replace(/response-time":\d+/, 'response-time":99999');
        const expected = kayvee.format({
          global: 1,
          global2: 2,
          url: "/hello/world?a=1&b=2",
          method: "GET",
          path: "/hello/world",
          params: "?a=1&b=2",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          level: "info",
        });
        assert.equal(masked, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        handlers: [
          () => ({global: 1}),
          () => ({global2: 2}),
          (req) => ({url: req.url}),
        ],
      };

      var server = createServer(serverType, options, {stream}, (req, res, next) => {
        next();
      });

      request(server)
      .get("/hello/world?a=1&b=2")
      .expect(200, cb);
    });

    it("should not log null or undefined values", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) { return done(err); }
        var masked = line.replace(/response-time":\d+/, 'response-time":99999');
        const expected = kayvee.format({
          method: "GET",
          path: "/hello/world",
          params: "?a=1&b=2",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          level: "info",
        });
        assert.equal(masked, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        // These values should not be logged
        headers: ["this-header-dne"],
        handlers: [
          () => ({undef: undefined}),
        ],
      };

      var server = createServer(serverType, options, {stream}, (req, res, next) => {
        next();
      });

      request(server)
      .get("/hello/world?a=1&b=2")
      .expect(200, cb);
    });

    it("should keep processing if there are broken user-specified handlers", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) { return done(err); }
        var masked = line.replace(/response-time":\d+/, 'response-time":99999');
        const expected = kayvee.format({
          global: 1,
          method: "GET",
          path: "/hello/world",
          params: "?a=1&b=2",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          level: "info",
        });
        assert.equal(masked, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        handlers: [
          // This handler should be ignored, because it has an error
          () => { throw (new Error("handler that throws an error")); },
          // This handler should still work
          () => ({global: 1}),
        ],
      };

      var server = createServer(serverType, options, {stream}, (req, res, next) => {
        next();
      });

      request(server)
      .get("/hello/world?a=1&b=2")
      .expect(200, cb);
    });

    it("should allow the user to override `base_handlers`", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) { return done(err); }
        var masked = line.replace(/response-time":\d+/, 'response-time":99999');
        const expected = kayvee.format({
          global: 1,
          base: 1,
        });
        assert.equal(masked, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        base_handlers: [
          () => ({base: 1}),
        ],
        handlers: [
          () => ({global: 1}),
        ],
      };

      var server = createServer(serverType, options, {stream}, (req, res, next) => {
        next();
      });

      request(server)
      .get("/hello/world?a=1&b=2")
      .expect(200, cb);
    });

    it("should be robust to handlers that return non Objects", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) { return done(err); }
        var masked = line.replace(/response-time":\d+/, 'response-time":99999');
        const expected = kayvee.format({
          global: 1,
          base: 1,
        });
        assert.equal(masked, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        base_handlers: [
          () => (1),
          () => ("a"),
          () => ([]),
          () => ({}),
          () => ({base: 1}),
        ],
        handlers: [
          () => (1),
          () => ("a"),
          () => ([]),
          () => ({}),
          () => ({global: 1}),
        ],
      };

      var server = createServer(serverType, options, {stream}, (req, res, next) => {
        next();
      });

      request(server)
      .get("/hello/world?a=1&b=2")
      .expect(200, cb);
    });
  });
});
