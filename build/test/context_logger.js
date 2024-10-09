var assert = require("assert");
var sinon = require("sinon");
var middleware = require("../lib/middleware");
var KayveeLogger = require("../lib/logger/logger");
describe("ContextLogger", () => {
    const fake_req = { key1: "val1" };
    const fake_handler = (req) => ({ log_key1: req.key1, key2: "val2" });
    for (const level of KayveeLogger.LEVELS) {
        it(`correctly adds context to ${level} calls`, () => {
            const spy = sinon.spy();
            const stub_logger = {};
            stub_logger[`${level}D`] = spy;
            const log = new middleware.ContextLogger(stub_logger, [fake_handler], fake_req);
            log[level]("test_title");
            const expected_context = { log_key1: "val1", key2: "val2" };
            assert(spy.calledWithExactly("test_title", expected_context));
            assert.equal(spy.callCount, 1);
        });
        it(`correctly adds context to ${level}D calls`, () => {
            const spy = sinon.spy();
            const stub_logger = {};
            stub_logger[`${level}D`] = spy;
            const log = new middleware.ContextLogger(stub_logger, [fake_handler], fake_req);
            log[`${level}D`]("test_title", { key2: "new_value", key3: "val3" });
            const expected_data = {
                log_key1: "val1",
                key2: "new_value",
                key3: "val3",
            };
            assert(spy.calledWithExactly("test_title", expected_data));
            assert.equal(spy.callCount, 1);
        });
    }
    for (const metric of KayveeLogger.METRICS) {
        it(`correctly adds context to ${metric} calls`, () => {
            const spy = sinon.spy();
            const stub_logger = {};
            stub_logger[`${metric}D`] = spy;
            const log = new middleware.ContextLogger(stub_logger, [fake_handler], fake_req);
            log[metric]("test_title", 3);
            const expected_context = { log_key1: "val1", key2: "val2" };
            assert(spy.calledWithExactly("test_title", 3, expected_context));
            assert.equal(spy.callCount, 1);
        });
        it(`correctly adds context to ${metric}D calls`, () => {
            const spy = sinon.spy();
            const stub_logger = {};
            stub_logger[`${metric}D`] = spy;
            const log = new middleware.ContextLogger(stub_logger, [fake_handler], fake_req);
            log[`${metric}D`]("test_title", 3, { key2: "new_value", key3: "val3" });
            const expected_data = {
                log_key1: "val1",
                key2: "new_value",
                key3: "val3",
            };
            assert(spy.calledWithExactly("test_title", 3, expected_data));
            assert.equal(spy.callCount, 1);
        });
    }
    it("correctly handles being instantiated with empty list of handlers", () => {
        const spy = sinon.spy();
        const stub_logger = { infoD: spy };
        const log = new middleware.ContextLogger(stub_logger, [], fake_req);
        log.info("test_title");
        const expected_context = {};
        assert(spy.calledWithExactly("test_title", expected_context));
        assert.equal(spy.callCount, 1);
    });
});
