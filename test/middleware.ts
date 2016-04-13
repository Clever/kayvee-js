var assert = require("assert");
var http = require("http");
var morgan = require("morgan");
var request = require("supertest");
var split = require("split");
var kayvee = require("../lib/kayvee");
var kv_middleware = require("../lib/middleware");

describe("middleware", function () {
  var expected;
  it("should pass default fields", function (done) {
    var cb = afterTest(2, function (err, res, line) {
      if (err) return done(err);
      var masked = line.replace(/response-time\":\d+/, 'response-time":99999');
      expected = kayvee.format({
        "method": "GET",
        "path": "/hello/world",
        "params": "?a=1&b=2",
        "response-size": 12345,
        "response-time": 99999,
        "status-code": 200,
        "x-forwarded-for": "foo",
      });
      assert.equal(masked, expected);
      done();
    });

    var stream = createLineStream(function (line) {
      cb(null, null, line);
    });

    var options = undefined;

    var server = createServer(options, {stream: stream}, function (req, res, next) {
      res.setHeader("some-header", "some-header-value");
      res.setHeader("content-length", 12345);
      next();
    });

    request(server)
    .get("/hello/world?a=1&b=2")
    .set("x-forwarded-for", "foo")
    .expect(200, cb);
  });

  it("should allow logging user-specified request headers", function (done) {
    var cb = afterTest(2, function (err, res, line) {
      if (err) return done(err);
      var masked = line.replace(/response-time\":\d+/, 'response-time":99999');
      expected = kayvee.format({
        "some-header": "some-header-value",
        "another-header": "another-header-value",
        "method": "GET",
        "path": "/hello/world",
        "params": "?a=1&b=2",
        "response-size": 12345,
        "response-time": 99999,
        "status-code": 200,
        "x-forwarded-for": "foo",
      });
      assert.equal(masked, expected);
      done();
    });

    var stream = createLineStream(function (line) {
      cb(null, null, line);
    });

    var options = {
      headers: ["some-header", "another-header"],
    };

    var server = createServer(options, {stream: stream}, function (req, res, next) {
      res.setHeader("content-length", 12345);
      next();
    });

    request(server)
    .get("/hello/world?a=1&b=2")
    .set("some-header", "some-header-value")
    .set("another-header", "another-header-value")
    .set("x-forwarded-for", "foo")
    .expect(200, cb);
  });

  it("should allow logging from user-specified handlers", function (done) {
    var cb = afterTest(2, function (err, res, line) {
      if (err) return done(err);
      var masked = line.replace(/response-time\":\d+/, 'response-time":99999');
      expected = kayvee.format({
        "global": 1,
        "global2": 2,
        "url": "/hello/world?a=1&b=2",
        "method": "GET",
        "path": "/hello/world",
        "params": "?a=1&b=2",
        "response-size": 12345,
        "response-time": 99999,
        "status-code": 200,
        "x-forwarded-for": "foo",
      });
      assert.equal(masked, expected);
      done();
    });

    var stream = createLineStream(function (line) {
      cb(null, null, line);
    });

    var options = {
      handlers: [
        function (req, res) {return {"global": 1};},
        function (req, res) {return {"global2": 2};},
        function (req, res) {return {"url": req.url};},
      ]
    };

    var server = createServer(options, {stream: stream}, function (req, res, next) {
      res.setHeader("content-length", 12345);
      next();
    });

    request(server)
    .get("/hello/world?a=1&b=2")
    .set("x-forwarded-for", "foo")
    .expect(200, cb);
  });

  it("should not log null or undefined values", function (done) {
    var cb = afterTest(2, function (err, res, line) {
      if (err) return done(err);
      var masked = line.replace(/response-time\":\d+/, 'response-time":99999');
      expected = kayvee.format({
        "method": "GET",
        "path": "/hello/world",
        "params": "?a=1&b=2",
        "response-size": 12345,
        "response-time": 99999,
        "status-code": 200,
        "x-forwarded-for": "foo",
      });
      assert.equal(masked, expected);
      done();
    });

    var stream = createLineStream(function (line) {
      cb(null, null, line);
    });

    var options = {
      // These values should not be logged
      headers: ["this-header-dne"],
      handlers: [
        function () { return {"undefined": undefined}; }
      ]
    };

    var server = createServer(options, {stream: stream}, function (req, res, next) {
      res.setHeader("content-length", 12345);
      next();
    });

    request(server)
    .get("/hello/world?a=1&b=2")
    .set("x-forwarded-for", "foo")
    .expect(200, cb);
  });

  it("should warn on broken user-specified handlers, and keep processing", function (done) {
    var cb = afterTest(2, function (err, res, line) {
      if (err) return done(err);
      var masked = line.replace(/response-time\":\d+/, 'response-time":99999');
      expected = kayvee.format({
        "global": 1,
        "method": "GET",
        "path": "/hello/world",
        "params": "?a=1&b=2",
        "response-size": 12345,
        "response-time": 99999,
        "status-code": 200,
        "x-forwarded-for": "foo",
      });
      assert.equal(masked, expected);
      done();
    });

    var stream = createLineStream(function (line) {
      cb(null, null, line);
    });

    var options = {
      handlers: [
        // These handlers should be ignored
        function (req, res) {throw ("error!");},
        function (req, res) {return req.foo.bar;},
        function (req, res) {return [];},
        // This handler should still work
        function (req, res) {return {"global":1}; },
      ]
    };

    var server = createServer(options, {stream: stream}, function (req, res, next) {
      res.setHeader("content-length", 12345);
      next();
    });

    request(server)
    .get("/hello/world?a=1&b=2")
    .set("x-forwarded-for", "foo")
    .expect(200, cb);
  });
});

/*
 * Copied from expressjs/morgan
 * https://github.com/expressjs/morgan/blob/master/test/morgan.js#L1332-L1380
 *
 * Modified `createServer`, since we are always testing Kayvee middleware here.
 * Renamed `after` -> `afterTest`; preventing typescript errors from overloading a Mocha function.
 */
function afterTest(count, callback) {
  var args = new Array(3);
  var i = 0;

  return function (err, arg1, arg2) {
    assert.ok(i++ < count, "callback called " + count + " times");

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

function createServer(clever_options, morgan_options, fn) {
  var logger = kv_middleware(clever_options, morgan_options);
  var middle = fn || noopMiddleware;

  return http.createServer(function onRequest(req, res) {
    logger(req, res, function onNext(err) {
      // allow req, res alterations
      middle(req, res, function onDone() {
        if (err) {
          res.statusCode = 500;
          res.end(err.message);
        }

        res.setHeader("X-Sent", "true");
        res.end((req.connection && req.connection.remoteAddress) || "-");
      });
    });
  });
}

function noopMiddleware(req, res, next) {
  next();
}
