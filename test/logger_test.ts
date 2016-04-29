var KayveeLogger = require("../lib/logger/logger");
var assert = require("assert");
var _ = require("underscore");
_.mixin = require("underscore.deep");

let sample = "";
function outputFunc(text) {
  sample = text;
  return sample;
}

describe("logger_test", () => {
  let logObj = null;
  let logObj2 = null;
  beforeEach(() => {
    logObj = new KayveeLogger("logger-tester");
    sample = "";
    return logObj.setOutput(outputFunc);
  });

  describe(".constructor", () => {
    it("passing in parameters to constructor", () => {
      const formatter = (data) => `${data.level}.${data.source}.${data.title}`;
      logObj = new KayveeLogger("logger-test", KayveeLogger.Info, formatter, outputFunc);
      logObj.debug("testlogdebug");
      let expected = "";
      assert.equal(sample, expected);

      logObj.info("testloginfo");
      expected = `${KayveeLogger.Info}.logger-test.testloginfo`;
      assert.equal(sample, expected);
    });
  });
  describe(".validateloglvl", () => {
    // Explicit validation checks
    it("is case-insensitive in log level name", () => {
      let logLvl = logObj._validateLogLvl("debug");
      assert.equal(logLvl, KayveeLogger.Debug);
      logLvl = logObj._validateLogLvl("Debug");
      assert.equal(logLvl, KayveeLogger.Debug);
    });

    it("sets non-default log levels", () => {
      let logLvl = logObj._validateLogLvl("info");
      assert.equal(logLvl, KayveeLogger.Info);
      // TODO: for each possible log level ...
      logLvl = logObj._validateLogLvl("critical");
      assert.equal(logLvl, KayveeLogger.Critical);
    });

    it("sets level to Debug, if given an invalid log level", () => {
      const logLvl = logObj._validateLogLvl("sometest");
      assert.equal(logLvl, KayveeLogger.Debug);
    });
  });
  describe(".invalidlog", () => {
    it("check valid debug level JSON output of invalid log level", () => {
      // Invalid log levels will default to debug
      logObj.setLogLevel("invalidloglevel");
      logObj.debug("testlogdebug");
      let expected = `{"source": "logger-tester", "level": "${KayveeLogger.Debug}", "title": "testlogdebug"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));

      logObj.setLogLevel("sometest");
      logObj.info("testloginfo");
      expected = `{"source": "logger-tester", "level": "${KayveeLogger.Info}", "title": "testloginfo"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
  });
  describe(".debug", () => {
    it("test debug function", () => {
      logObj.debug("testlogdebug");
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Debug}", "title": "testlogdebug"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
    it("test debugD function", () => {
      logObj.debugD("testlogdebug", {key1: "val1", key2: "val2"});
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Debug}", "title": "testlogdebug","key1": "val1", "key2": "val2"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
  });

  describe(".info", () => {
    it("test info function", () => {
      logObj.info("testloginfo");
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Info}", "title": "testloginfo"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
    it("test infoD function", () => {
      logObj.infoD("testloginfo", {key1: "val1", key2: "val2"});
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Info}", "title": "testloginfo","key1": "val1", "key2": "val2"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
  });

  describe(".warning", () => {
    it("test warn function", () => {
      logObj.warn("testlogwarning");
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Warning}", "title": "testlogwarning"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
    it("test warnD function", () => {
      logObj.warnD("testlogwarning", {key1: "val1", key2: "val2"});
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Warning}", "title": "testlogwarning","key1": "val1", "key2": "val2"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
  });

  describe(".error", () => {
    it("test error function", () => {
      logObj.error("testlogerror");
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Error}", "title": "testlogerror"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
    it("test errorD function", () => {
      logObj.errorD("testlogerror", {key1: "val1", key2: "val2"});
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Error}", "title": "testlogerror","key1": "val1", "key2": "val2"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
  });

  describe(".critical", () => {
    it("test critical function", () => {
      logObj.critical("testlogcritical");
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Critical}", "title": "testlogcritical"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
    it("test criticalD function", () => {
      logObj.criticalD("testlogcritical", {key1: "val1", key2: "val2"});
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Critical}", "title": "testlogcritical","key1": "val1", "key2": "val2"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
  });

  describe(".counter", () => {
    it("test counter function", () => {
      logObj.counter("testlogcounter");
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Info}", "title": "testlogcounter", "type": "counter", "value": 1}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
    it("test counterD function", () => {
      logObj.counterD("testlogcounter", 2, {key1: "val1", key2: "val2"});
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Info}", "title": "testlogcounter","type": "counter", "value": 2,"key1": "val1",` +
        " \"key2\": \"val2\"}";
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
  });

  describe(".gauge", () => {
    it("test gauge function", () => {
      logObj.gauge("testloggauge", 0);
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Info}", "title": "testloggauge", "type": "gauge", "value": 0}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
    it("test gaugeD function", () => {
      logObj.gaugeD("testloggauge", 4, {key1: "val1", key2: "val2"});
      const expected = `{"source": "logger-tester", "level": "${KayveeLogger.Info}", "title": "testloggauge", "type": "gauge", "value": 4, "key1": "val1",` +
        "\"key2\": \"val2\"}";
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
  });

  describe(".diffoutput", () => {
    it("output to different output functions using same logger", () => {
      logObj.info("testloginfo");
      const infoLog = sample;
      let output2 = "";
      const outputFunc2 = (text) => {
        output2 = text;
        return output2;
      };
      logObj.setOutput(outputFunc2);
      logObj.warn("testlogwarning");
      assert.deepEqual(JSON.parse(infoLog), JSON.parse(sample));
      assert.notDeepEqual(JSON.parse(output2), JSON.parse(sample));
    });
  });

  describe(".nomodifydata", () => {
    before(() => {
      logObj.setOutput(outputFunc);
    });
    it("does not modify data", () => {
      const data = {
        str: "modify",
        obj: {
          key: "value",
        },
        fun: "boo",
      };
      // not using deepClone since that's what we are
      // somewhat testing
      const dataCopy = {
        str: "modify",
        obj: {
          key: "value",
        },
        fun: "boo",
      };
      const output = ['{"title":"testInfoWithData",',
        '"str":"modify","obj":{"key":"value"},"fun":"boo",',
        '"level":"info","source":"logger-tester"}'].join("");
      logObj.infoD("testInfoWithData", data);
      assert.deepEqual(data, dataCopy);
      assert.equal(sample, output);
    });
  });

  describe(".hiddenlog", () => {
    describe(".logwarning", () => {
      beforeEach(() => logObj.setLogLevel(KayveeLogger.Warning));
      it("empty cases due to log level", () => {
        logObj.debug("testlogdebug");
        assert.equal(sample, "");

        logObj.info("testloginfo");
        assert.equal(sample, "");
      });
      it("not empty cases due to log level", () => {
        logObj.warn("testlogwarning");
        assert.notDeepEqual(JSON.parse(sample), "");

        logObj.error("testlogerror");
        assert.notDeepEqual(JSON.parse(sample), "");

        logObj.critical("testlogcritical");
        assert.notDeepEqual(JSON.parse(sample), "");
      });
    });
    return describe(".logcritical", () => {
      beforeEach(() => {
        logObj.setLogLevel(KayveeLogger.Critical);
      });
      it("empty cases due to log level", () => {
        logObj.debug("testlogdebug");
        assert.equal(sample, "");

        logObj.info("testloginfo");
        assert.equal(sample, "");

        logObj.warn("testlogwarning");
        assert.equal(sample, "");

        logObj.error("testlogerror");
        assert.equal(sample, "");
      });
      it("not empty cases due to log level", () => {
        logObj.critical("testlogcritical");
        assert.notDeepEqual(JSON.parse(sample), "");
      });
    });
  });

  describe(".diffformat", () => {
    it("use a different formatter than KV", () => {
      const testFormatter = () => "\"This is a test\"";
      logObj.setFormatter(testFormatter);
      logObj.warn("testlogwarning");
      assert.deepEqual(JSON.parse(sample), "This is a test");
    });
  });

  return describe(".multipleloggers", () => {
    before(() => {
      logObj2 = new KayveeLogger("logger-tester2");
      return logObj2;
    });
    it("log to same output buffer", () => {
      logObj2.setOutput(outputFunc);
      logObj.warn("testlogwarning");
      const output1 = sample;
      logObj2.info("testloginfo");
      assert.notDeepEqual(JSON.parse(sample), JSON.parse(output1));
    });

    it("log to different output buffer", () => {
      let output2 = "";
      const outputFunc2 = (text) => {
        output2 = text;
        return output2;
      };
      logObj2.setOutput(outputFunc2);
      logObj.warn("testlogwarning");
      logObj2.info("testloginfo");

      const loggerExpected = `{"source": "logger-tester", "level": "${KayveeLogger.Warning}", "title": "testlogwarning"}`;
      assert.deepEqual(JSON.parse(sample), JSON.parse(loggerExpected));

      const logger2Expected = `{"source": "logger-tester2", "level": "${KayveeLogger.Info}", "title": "testloginfo"}`;
      assert.deepEqual(JSON.parse(output2), JSON.parse(logger2Expected));
    });
  });
});
