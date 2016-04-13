var assert = require("assert");
var http = require("http");
var request = require("supertest");
var split = require("split");
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

function createServer(clever_options, morgan_options, fn) {
  var logger = kv_middleware(clever_options, morgan_options);
  var middle = fn || noopMiddleware;

  return http.createServer((req, res) => {
    logger(req, res, (err) => {
      // allow req, res alterations
      middle(req, res, () => {
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

describe("middleware", () => {
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
        ip: "foo",
      });
      assert.equal(masked, expected);
      return done();
    });

    var stream = createLineStream((line) => {
      cb(null, null, line);
    });

    var options = undefined;

    var server = createServer(options, {stream}, (req, res, next) => {
      res.setHeader("some-header", "some-header-value");
      res.setHeader("content-length", 12345);
      next();
    });

    request(server)
    .get("/hello/world?a=1&b=2")
    .set("X-Forwarded-For", "foo")
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
        ip: "foo",
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

    var server = createServer(options, {stream}, (req, res, next) => {
      res.setHeader("content-length", 12345);
      next();
    });

    request(server)
    .get("/hello/world?a=1&b=2")
    .set("some-header", "some-header-value")
    .set("another-header", "another-header-value")
    .set("X-Forwarded-For", "foo")
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
        ip: "foo",
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

    var server = createServer(options, {stream}, (req, res, next) => {
      res.setHeader("content-length", 12345);
      next();
    });

    request(server)
    .get("/hello/world?a=1&b=2")
    .set("X-Forwarded-For", "foo")
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
        ip: "foo",
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

    var server = createServer(options, {stream}, (req, res, next) => {
      res.setHeader("content-length", 12345);
      next();
    });

    request(server)
    .get("/hello/world?a=1&b=2")
    .set("X-Forwarded-For", "foo")
    .expect(200, cb);
  });

  it("should warn on broken user-specified handlers, and keep processing", (done) => {
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
        ip: "foo",
      });
      assert.equal(masked, expected);
      return done();
    });

    var stream = createLineStream((line) => {
      cb(null, null, line);
    });

    var options = {
      handlers: [
        // These handlers should be ignored, because they have errors
        () => { throw (new Error("handler that throws an error")); },
        (req) => (req.foo.bar),
        () => ([]),
        () => (3), // TODO: should be robust to wrong data types
        // This handler should still work
        () => ({global: 1}),
      ],
    };

    var server = createServer(options, {stream}, (req, res, next) => {
      res.setHeader("content-length", 12345);
      next();
    });

    request(server)
    .get("/hello/world?a=1&b=2")
    .set("X-Forwarded-For", "foo")
    .expect(200, cb);
  });
});
