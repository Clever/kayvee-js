var assert = require("assert");
var express = require("express");
var http = require("http");
var path = require("path");
var request = require("supertest");
var split = require("split");
var _ = require("underscore");
var kayee_logger = require("../lib/logger/logger");
var kv_middleware = require("../lib/middleware");

kayee_logger.setGlobalRouting(path.join(__dirname, "/kvconfig.yml"));

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
      callback(...args);
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
    app.use(express.static(`${__dirname}/static`));
    app.get("*", (req, res) => {
      res.header("Content-Length", 12345);
      res.end();
    });

    server = app;
  } else {
    throw new Error(`unknown server type: ${server_type}`);
  }

  return server;
}

_.each(["http", "express"], (serverType) => {
  describe(`middleware for *${serverType}* server: prototype pollution testing`, () => {
    it("params with toString is stripped", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) {
          return done(err);
        }
        const expected = {
          method: "GET",
          path: "/hello/world",
          params: "?",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          via: "kayvee-middleware",
          level: "info",
          title: "request-finished",
          deploy_env: "testing",
          wf_id: "abc",
          source: "test-app",
          _kvmeta: {
            team: "UNSET",
            kv_version: "X.X.X",
            kv_language: "js",
            routes: [
              { type: "analytics", series: "requests.everything", rule: "all-kv_middleware" },
            ],
          },
        };
        var actual = JSON.parse(line);
        actual["response-time"] = 99999; // Masking the two fields that
        actual._kvmeta.kv_version = "X.X.X"; // are expected to change

        assert.deepEqual(actual, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        source: "test-app",
        ignore_dir: {
          directory: `${__dirname}/static`,
          // path: "/", defaults to /
        },
      };

      var server = createServer(serverType, options, { stream }, (req, res, next) => {
        next();
      });

      // this one is logged
      request(server).get("/hello/world?toString=foo").expect(200, cb);
    });
    it("params from actual attack is stripped", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) {
          return done(err);
        }
        const expected = {
          method: "GET",
          path: "/hello/world",
          params: "?",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          via: "kayvee-middleware",
          level: "info",
          title: "request-finished",
          deploy_env: "testing",
          wf_id: "abc",
          source: "test-app",
          _kvmeta: {
            team: "UNSET",
            kv_version: "X.X.X",
            kv_language: "js",
            routes: [
              { type: "analytics", series: "requests.everything", rule: "all-kv_middleware" },
            ],
          },
        };
        var actual = JSON.parse(line);
        actual["response-time"] = 99999; // Masking the two fields that
        actual._kvmeta.kv_version = "X.X.X"; // are expected to change

        assert.deepEqual(actual, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        source: "test-app",
        ignore_dir: {
          directory: `${__dirname}/static`,
          // path: "/", defaults to /
        },
      };

      var server = createServer(serverType, options, { stream }, (req, res, next) => {
        next();
      });

      const params = `__proto__[Expect]=xxx
        &constructor[prototype][Expect]=xxx`;
      // this one is logged
      request(server).get(`/hello/world?${params}`).expect(200, cb);
    });
  });
  describe(`middleware for *${serverType}* server`, () => {
    it("should throw error on intialization if `source` not set in `options`", (done) => {
      var options = {};
      var erroringServer = () =>
        createServer(serverType, options, null, (req, res, next) => {
          res.setHeader("some-header", "some-header-value");
          next();
        });
      assert.throws(erroringServer, Error, "Expected an error to be thrown");
      return done();
    });

    it("should pass default fields", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) {
          return done(err);
        }
        const expected = {
          method: "GET",
          path: "/hello/world",
          params: "?a=1&b=2",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          via: "kayvee-middleware",
          level: "info",
          title: "request-finished",
          deploy_env: "testing",
          wf_id: "abc",
          source: "test-app",
          _kvmeta: {
            team: "UNSET",
            kv_version: "X.X.X",
            kv_language: "js",
            routes: [
              { type: "analytics", series: "requests.everything", rule: "all-kv_middleware" },
            ],
          },
        };

        var actual = JSON.parse(line);
        actual["response-time"] = 99999; // Masking the two fields that
        actual._kvmeta.kv_version = "X.X.X"; // are expected to change

        assert.deepEqual(actual, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = { source: "test-app" };

      var server = createServer(serverType, options, { stream }, (req, res, next) => {
        res.setHeader("some-header", "some-header-value");
        next();
      });

      request(server).get("/hello/world?a=1&b=2").expect(200, cb);
    });

    it("should allow logging user-specified request headers", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) {
          return done(err);
        }
        const expected = {
          "some-header": "some-header-value",
          "another-header": "another-header-value",
          method: "GET",
          path: "/hello/world",
          params: "?a=1&b=2",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          via: "kayvee-middleware",
          level: "info",
          title: "request-finished",
          deploy_env: "testing",
          wf_id: "abc",
          source: "test-app",
          _kvmeta: {
            team: "UNSET",
            kv_version: "X.X.X",
            kv_language: "js",
            routes: [
              { type: "analytics", series: "requests.everything", rule: "all-kv_middleware" },
            ],
          },
        };
        var actual = JSON.parse(line);
        actual["response-time"] = 99999; // Masking the two fields that
        actual._kvmeta.kv_version = "X.X.X"; // are expected to change

        assert.deepEqual(actual, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        source: "test-app",
        headers: ["some-header", "another-header"],
      };

      var server = createServer(serverType, options, { stream }, (req, res, next) => {
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
        if (err) {
          return done(err);
        }
        const expected = {
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
          via: "kayvee-middleware",
          level: "info",
          title: "request-finished",
          deploy_env: "testing",
          wf_id: "abc",
          source: "test-app",
          _kvmeta: {
            team: "UNSET",
            kv_version: "X.X.X",
            kv_language: "js",
            routes: [
              { type: "analytics", series: "requests.everything", rule: "all-kv_middleware" },
            ],
          },
        };
        var actual = JSON.parse(line);
        actual["response-time"] = 99999; // Masking the two fields that
        actual._kvmeta.kv_version = "X.X.X"; // are expected to change

        assert.deepEqual(actual, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        source: "test-app",
        handlers: [() => ({ global: 1 }), () => ({ global2: 2 }), (req) => ({ url: req.url })],
      };

      var server = createServer(serverType, options, { stream }, (req, res, next) => {
        next();
      });

      request(server).get("/hello/world?a=1&b=2").expect(200, cb);
    });

    it("should not log null or undefined values", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) {
          return done(err);
        }
        const expected = {
          method: "GET",
          path: "/hello/world",
          params: "?a=1&b=2",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          via: "kayvee-middleware",
          level: "info",
          title: "request-finished",
          deploy_env: "testing",
          wf_id: "abc",
          source: "test-app",
          _kvmeta: {
            team: "UNSET",
            kv_version: "X.X.X",
            kv_language: "js",
            routes: [
              { type: "analytics", series: "requests.everything", rule: "all-kv_middleware" },
            ],
          },
        };
        var actual = JSON.parse(line);
        actual["response-time"] = 99999; // Masking the two fields that
        actual._kvmeta.kv_version = "X.X.X"; // are expected to change

        assert.deepEqual(actual, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        source: "test-app",
        // These values should not be logged
        headers: ["this-header-dne"],
        handlers: [() => ({ undef: undefined })],
      };

      var server = createServer(serverType, options, { stream }, (req, res, next) => {
        next();
      });

      request(server).get("/hello/world?a=1&b=2").expect(200, cb);
    });

    it("should keep processing if there are broken user-specified handlers", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) {
          return done(err);
        }
        const expected = {
          global: 1,
          method: "GET",
          path: "/hello/world",
          params: "?a=1&b=2",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          via: "kayvee-middleware",
          level: "info",
          title: "request-finished",
          deploy_env: "testing",
          wf_id: "abc",
          source: "test-app",
          _kvmeta: {
            team: "UNSET",
            kv_version: "X.X.X",
            kv_language: "js",
            routes: [
              { type: "analytics", series: "requests.everything", rule: "all-kv_middleware" },
            ],
          },
        };
        var actual = JSON.parse(line);
        actual["response-time"] = 99999; // Masking the two fields that
        actual._kvmeta.kv_version = "X.X.X"; // are expected to change

        assert.deepEqual(actual, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        source: "test-app",
        handlers: [
          // This handler should be ignored, because it has an error
          () => {
            throw new Error("handler that throws an error");
          },
          // This handler should still work
          () => ({ global: 1 }),
        ],
      };

      var server = createServer(serverType, options, { stream }, (req, res, next) => {
        next();
      });

      request(server).get("/hello/world?a=1&b=2").expect(200, cb);
    });

    it("should allow the user to override `base_handlers`", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) {
          return done(err);
        }
        const expected = {
          global: 1,
          base: 1,
          deploy_env: "testing",
          wf_id: "abc",
          source: "test-app",
          _kvmeta: {
            team: "UNSET",
            kv_version: "X.X.X",
            kv_language: "js",
            routes: [],
          },
        };

        var actual = JSON.parse(line);
        actual._kvmeta.kv_version = "X.X.X"; // Masking field that is expected to change

        assert.deepEqual(actual, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        source: "test-app",
        base_handlers: [() => ({ base: 1 })],
        handlers: [() => ({ global: 1 })],
      };

      var server = createServer(serverType, options, { stream }, (req, res, next) => {
        next();
      });

      request(server).get("/hello/world?a=1&b=2").expect(200, cb);
    });

    it("should be robust to handlers that return non Objects", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) {
          return done(err);
        }
        const expected = {
          global: 1,
          base: 1,
          source: "test-app",
          deploy_env: "testing",
          wf_id: "abc",
          _kvmeta: {
            team: "UNSET",
            kv_version: "X.X.X",
            kv_language: "js",
            routes: [],
          },
        };

        var actual = JSON.parse(line);
        actual._kvmeta.kv_version = "X.X.X"; // Masking field that is expected to change

        assert.deepEqual(actual, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        source: "test-app",
        base_handlers: [() => 1, () => "a", () => [], () => ({}), () => ({ base: 1 })],
        handlers: [() => 1, () => "a", () => [], () => ({}), () => ({ global: 1 })],
      };

      var server = createServer(serverType, options, { stream, skip: null }, (req, res, next) => {
        next();
      });

      request(server).get("/hello/world?a=1&b=2").expect(200, cb);
    });
    it("allows ignoring requests to files in a static directory", (done) => {
      var cb = afterTest(2, (err, res, line) => {
        if (err) {
          return done(err);
        }
        const expected = {
          method: "GET",
          path: "/hello/world",
          params: "?",
          "response-size": 12345,
          "response-time": 99999,
          "status-code": 200,
          ip: "::ffff:127.0.0.1",
          via: "kayvee-middleware",
          level: "info",
          title: "request-finished",
          deploy_env: "testing",
          wf_id: "abc",
          source: "test-app",
          _kvmeta: {
            team: "UNSET",
            kv_version: "X.X.X",
            kv_language: "js",
            routes: [
              { type: "analytics", series: "requests.everything", rule: "all-kv_middleware" },
            ],
          },
        };
        var actual = JSON.parse(line);
        actual["response-time"] = 99999; // Masking the two fields that
        actual._kvmeta.kv_version = "X.X.X"; // are expected to change

        assert.deepEqual(actual, expected);
        return done();
      });

      var stream = createLineStream((line) => {
        cb(null, null, line);
      });

      var options = {
        source: "test-app",
        ignore_dir: {
          directory: `${__dirname}/static`,
          // path: "/", defaults to /
        },
      };

      var server = createServer(serverType, options, { stream }, (req, res, next) => {
        next();
      });

      // this line is never logged
      request(server).get("/empty.css").expect(200);

      // this one is logged
      request(server).get("/hello/world").expect(200, cb);
    });
  });
});
