var assert = require("assert");
var sinon = require("sinon");
var middleware = require("../lib/middleware");
var KayveeLogger = require("../lib/logger/logger");
describe("ContextLogger", function () {
    var fake_req = { key1: "val1" };
    var fake_handler = function (req) { return ({ log_key1: req.key1, key2: "val2" }); };
    var _loop_1 = function (level) {
        it("correctly adds context to " + level + " calls", function () {
            var spy = sinon.spy();
            var stub_logger = {};
            stub_logger[level + "D"] = spy;
            var log = new middleware.ContextLogger(stub_logger, [fake_handler], fake_req);
            log[level]("test_title");
            var expected_context = { log_key1: "val1", key2: "val2" };
            assert(spy.calledWithExactly("test_title", expected_context));
            assert.equal(spy.callCount, 1);
        });
        it("correctly adds context to " + level + "D calls", function () {
            var spy = sinon.spy();
            var stub_logger = {};
            stub_logger[level + "D"] = spy;
            var log = new middleware.ContextLogger(stub_logger, [fake_handler], fake_req);
            log[level + "D"]("test_title", { key2: "new_value", key3: "val3" });
            var expected_data = {
                log_key1: "val1",
                key2: "new_value",
                key3: "val3",
            };
            assert(spy.calledWithExactly("test_title", expected_data));
            assert.equal(spy.callCount, 1);
        });
    };
    for (var _i = 0, _a = KayveeLogger.LEVELS; _i < _a.length; _i++) {
        var level = _a[_i];
        _loop_1(level);
    }
    var _loop_2 = function (metric) {
        it("correctly adds context to " + metric + " calls", function () {
            var spy = sinon.spy();
            var stub_logger = {};
            stub_logger[metric + "D"] = spy;
            var log = new middleware.ContextLogger(stub_logger, [fake_handler], fake_req);
            log[metric]("test_title", 3);
            var expected_context = { log_key1: "val1", key2: "val2" };
            assert(spy.calledWithExactly("test_title", 3, expected_context));
            assert.equal(spy.callCount, 1);
        });
        it("correctly adds context to " + metric + "D calls", function () {
            var spy = sinon.spy();
            var stub_logger = {};
            stub_logger[metric + "D"] = spy;
            var log = new middleware.ContextLogger(stub_logger, [fake_handler], fake_req);
            log[metric + "D"]("test_title", 3, { key2: "new_value", key3: "val3" });
            var expected_data = {
                log_key1: "val1",
                key2: "new_value",
                key3: "val3",
            };
            assert(spy.calledWithExactly("test_title", 3, expected_data));
            assert.equal(spy.callCount, 1);
        });
    };
    for (var _b = 0, _c = KayveeLogger.METRICS; _b < _c.length; _b++) {
        var metric = _c[_b];
        _loop_2(metric);
    }
    it("correctly handles being instantiated with empty list of handlers", function () {
        var spy = sinon.spy();
        var stub_logger = { infoD: spy };
        var log = new middleware.ContextLogger(stub_logger, [], fake_req);
        log.info("test_title");
        var expected_context = {};
        assert(spy.calledWithExactly("test_title", expected_context));
        assert.equal(spy.callCount, 1);
    });
});
