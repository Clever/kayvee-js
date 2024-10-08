var KayveeLogger = require("../lib/logger/logger");
var assert = require("assert");
var sample = "";
function outputFunc(text) {
    sample = text;
    return sample;
}
describe("logger_test", function () {
    var logObj = null;
    var logObj2 = null;
    beforeEach(function () {
        logObj = new KayveeLogger("logger-tester");
        sample = "";
        return logObj.setOutput(outputFunc);
    });
    describe(".constructor", function () {
        it("passing in parameters to constructor", function () {
            var formatter = function (data) { return data.level + "." + data.source + "." + data.title; };
            logObj = new KayveeLogger("logger-test", KayveeLogger.Info, formatter, outputFunc);
            logObj.debug("testlogdebug");
            var expected = "";
            assert.equal(sample, expected);
            logObj.info("testloginfo");
            expected = KayveeLogger.Info + ".logger-test.testloginfo";
            assert.equal(sample, expected);
        });
    });
    describe(".validateloglvl", function () {
        // Explicit validation checks
        it("is case-insensitive in log level name", function () {
            var logLvl = logObj._validateLogLvl("debug");
            assert.equal(logLvl, KayveeLogger.Debug);
            logLvl = logObj._validateLogLvl("Debug");
            assert.equal(logLvl, KayveeLogger.Debug);
        });
        it("sets non-default log levels", function () {
            var logLvl = logObj._validateLogLvl("info");
            assert.equal(logLvl, KayveeLogger.Info);
            // TODO: for each possible log level ...
            logLvl = logObj._validateLogLvl("critical");
            assert.equal(logLvl, KayveeLogger.Critical);
        });
        it("sets level to Debug, if given an invalid log level", function () {
            var logLvl = logObj._validateLogLvl("sometest");
            assert.equal(logLvl, KayveeLogger.Debug);
        });
    });
    describe(".invalidlog", function () {
        it("check valid debug level JSON output of invalid log level", function () {
            // Invalid log levels will default to debug
            logObj.setLogLevel("invalidloglevel");
            logObj.debug("testlogdebug");
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\", \"level\": \"" + KayveeLogger.Debug + "\", \"title\": \"testlogdebug\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
            logObj.setLogLevel("sometest");
            logObj.info("testloginfo");
            expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\", \"level\": \"" + KayveeLogger.Info + "\", \"title\": \"testloginfo\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
    });
    describe(".debug", function () {
        it("test debug function", function () {
            logObj.debug("testlogdebug");
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\", \"level\": \"" + KayveeLogger.Debug + "\", \"title\": \"testlogdebug\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
        it("test debugD function", function () {
            logObj.debugD("testlogdebug", { key1: "val1", key2: "val2" });
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\",\n\"level\": \"" + KayveeLogger.Debug + "\", \"title\": \"testlogdebug\",\"key1\": \"val1\", \"key2\": \"val2\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
    });
    describe(".info", function () {
        it("test info function", function () {
            logObj.info("testloginfo");
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\", \"level\": \"" + KayveeLogger.Info + "\", \"title\": \"testloginfo\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
        it("test infoD function", function () {
            logObj.infoD("testloginfo", { key1: "val1", key2: "val2" });
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\",\n\"level\": \"" + KayveeLogger.Info + "\", \"title\": \"testloginfo\",\"key1\": \"val1\", \"key2\": \"val2\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
    });
    describe(".warning", function () {
        it("test warn function", function () {
            logObj.warn("testlogwarning");
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\", \"level\": \"" + KayveeLogger.Warning + "\", \"title\": \"testlogwarning\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
        it("test warnD function", function () {
            logObj.warnD("testlogwarning", { key1: "val1", key2: "val2" });
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\",\n\"level\": \"" + KayveeLogger.Warning + "\", \"title\": \"testlogwarning\",\"key1\": \"val1\", \"key2\": \"val2\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
    });
    describe(".error", function () {
        it("test error function", function () {
            logObj.error("testlogerror");
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\", \"level\": \"" + KayveeLogger.Error + "\", \"title\": \"testlogerror\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
        it("test errorD function", function () {
            logObj.errorD("testlogerror", { key1: "val1", key2: "val2" });
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\",\n\"level\": \"" + KayveeLogger.Error + "\", \"title\": \"testlogerror\",\"key1\": \"val1\", \"key2\": \"val2\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
    });
    describe(".critical", function () {
        it("test critical function", function () {
            logObj.critical("testlogcritical");
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\", \"level\": \"" + KayveeLogger.Critical + "\", \"title\": \"testlogcritical\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
        it("test criticalD function", function () {
            logObj.criticalD("testlogcritical", { key1: "val1", key2: "val2" });
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\",\n\"level\": \"" + KayveeLogger.Critical + "\", \"title\": \"testlogcritical\",\"key1\": \"val1\", \"key2\": \"val2\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
    });
    describe(".counter", function () {
        it("test counter function", function () {
            logObj.counter("testlogcounter");
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\",\n\"level\": \"" + KayveeLogger.Info + "\", \"title\": \"testlogcounter\", \"type\": \"counter\", \"value\": 1}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
        it("test counterD function", function () {
            logObj.counterD("testlogcounter", 2, { key1: "val1", key2: "val2" });
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\",\n\"level\": \"" + KayveeLogger.Info + "\", \"title\": \"testlogcounter\",\"type\": \"counter\", \"value\": 2,\"key1\": \"val1\"," +
                ' "key2": "val2"}';
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
        it("test counterD function with overrides", function () {
            logObj.counterD("testlogcounter", 2, { key1: "val1", key2: "val2", value: 18 });
            var expected = {
                deploy_env: "testing",
                wf_id: "abc",
                source: "logger-tester",
                level: KayveeLogger.Info,
                title: "testlogcounter",
                type: "counter",
                value: 18,
                key1: "val1",
                key2: "val2",
            };
            assert.deepEqual(JSON.parse(sample), expected);
        });
    });
    describe(".gauge", function () {
        it("test gauge function", function () {
            logObj.gauge("testloggauge", 0);
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\",\n\"level\": \"" + KayveeLogger.Info + "\", \"title\": \"testloggauge\", \"type\": \"gauge\", \"value\": 0}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
        it("test gaugeD function", function () {
            logObj.gaugeD("testloggauge", 4, { key1: "val1", key2: "val2" });
            var expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\",\n\"level\": \"" + KayveeLogger.Info + "\", \"title\": \"testloggauge\", \"type\": \"gauge\", \"value\": 4, \"key1\": \"val1\", \"key2\": \"val2\"}";
            assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
        });
        it("test gaugeD function with overrids", function () {
            logObj.gaugeD("testloggauge", 4, { key1: "val1", key2: "val2", value: 18 });
            var expected = {
                deploy_env: "testing",
                wf_id: "abc",
                source: "logger-tester",
                level: KayveeLogger.Info,
                title: "testloggauge",
                type: "gauge",
                value: 18,
                key1: "val1",
                key2: "val2",
            };
            assert.deepEqual(JSON.parse(sample), expected);
        });
    });
    describe(".diffoutput", function () {
        it("output to different output functions using same logger", function () {
            logObj.info("testloginfo");
            var infoLog = sample;
            var output2 = "";
            var outputFunc2 = function (text) {
                output2 = text;
                return output2;
            };
            logObj.setOutput(outputFunc2);
            logObj.warn("testlogwarning");
            assert.deepEqual(JSON.parse(infoLog), JSON.parse(sample));
            assert.notDeepEqual(JSON.parse(output2), JSON.parse(sample));
        });
    });
    describe(".nomodifydata", function () {
        before(function () {
            logObj.setOutput(outputFunc);
        });
        it("does not modify data", function () {
            var data = {
                str: "modify",
                obj: {
                    key: "value",
                },
                fun: "boo",
            };
            // not using deepClone since that's what we are
            // somewhat testing
            var dataCopy = {
                str: "modify",
                obj: {
                    key: "value",
                },
                fun: "boo",
            };
            logObj.infoD("testInfoWithData", data);
            assert.deepEqual(data, dataCopy);
            var output = {
                deploy_env: "testing",
                wf_id: "abc",
                fun: "boo",
                level: "info",
                obj: {
                    key: "value",
                },
                source: "logger-tester",
                title: "testInfoWithData",
                str: "modify",
            };
            assert.deepEqual(JSON.parse(sample), output);
        });
    });
    describe(".hiddenlog", function () {
        describe(".logwarning", function () {
            beforeEach(function () { return logObj.setLogLevel(KayveeLogger.Warning); });
            it("empty cases due to log level", function () {
                logObj.debug("testlogdebug");
                assert.equal(sample, "");
                logObj.info("testloginfo");
                assert.equal(sample, "");
            });
            it("not empty cases due to log level", function () {
                logObj.warn("testlogwarning");
                assert.notDeepEqual(JSON.parse(sample), "");
                logObj.error("testlogerror");
                assert.notDeepEqual(JSON.parse(sample), "");
                logObj.critical("testlogcritical");
                assert.notDeepEqual(JSON.parse(sample), "");
            });
        });
        return describe(".logcritical", function () {
            beforeEach(function () {
                logObj.setLogLevel(KayveeLogger.Critical);
            });
            it("empty cases due to log level", function () {
                logObj.debug("testlogdebug");
                assert.equal(sample, "");
                logObj.info("testloginfo");
                assert.equal(sample, "");
                logObj.warn("testlogwarning");
                assert.equal(sample, "");
                logObj.error("testlogerror");
                assert.equal(sample, "");
            });
            it("not empty cases due to log level", function () {
                logObj.critical("testlogcritical");
                assert.notDeepEqual(JSON.parse(sample), "");
            });
        });
    });
    describe(".diffformat", function () {
        it("use a different formatter than KV", function () {
            var testFormatter = function () { return '"This is a test"'; };
            logObj.setFormatter(testFormatter);
            logObj.warn("testlogwarning");
            assert.deepEqual(JSON.parse(sample), "This is a test");
        });
    });
    describe("global overrides", function () {
        it("what data has source prop", function () {
            logObj.warnD("global-override", { source: "overrided" });
            var output = {
                deploy_env: "testing",
                wf_id: "abc",
                title: "global-override",
                source: "overrided",
                level: "warning",
            };
            assert.deepEqual(JSON.parse(sample), output);
        });
    });
    return describe(".multipleloggers", function () {
        before(function () {
            logObj2 = new KayveeLogger("logger-tester2");
            return logObj2;
        });
        it("log to same output buffer", function () {
            logObj2.setOutput(outputFunc);
            logObj.warn("testlogwarning");
            var output1 = sample;
            logObj2.info("testloginfo");
            assert.notDeepEqual(JSON.parse(sample), JSON.parse(output1));
        });
        it("log to different output buffer", function () {
            var output2 = "";
            var outputFunc2 = function (text) {
                output2 = text;
                return output2;
            };
            logObj2.setOutput(outputFunc2);
            logObj.warn("testlogwarning");
            logObj2.info("testloginfo");
            var loggerExpected = "\n      {\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester\", \"level\": \"" + KayveeLogger.Warning + "\", \"title\": \"testlogwarning\"}\n      ";
            assert.deepEqual(JSON.parse(sample), JSON.parse(loggerExpected));
            var logger2Expected = "{\"deploy_env\": \"testing\", \"wf_id\": \"abc\", \"source\": \"logger-tester2\", \"level\": \"" + KayveeLogger.Info + "\", \"title\": \"testloginfo\"}";
            assert.deepEqual(JSON.parse(output2), JSON.parse(logger2Expected));
        });
    });
});
describe("mockRouting", function () {
    it("can override routing from setGlobalRouting, and captures routed logs", function () {
        var logObj = new KayveeLogger("test-source");
        KayveeLogger.mockRouting(function (kvdone) {
            KayveeLogger.setGlobalRouting("test/kvconfig.yml");
            logObj.info("foo-title");
            var ruleMatches = kvdone();
            // should match one log
            assert.equal(ruleMatches["rule-two"].length, 1);
            // matched log should look like so
            var expectedRule = {
                type: "analytics",
                series: "requests.everything",
                rule: "rule-two",
            };
            assert.deepEqual(ruleMatches["rule-two"][0], expectedRule);
        });
    });
});
