var kv  = require("../lib/kayvee");
var logger = require("../lib/logger/logger");
var assert = require('assert');
var _ = require('underscore');
_.mixin = require('underscore.deep');
var fs = require('fs');

var sample = "";
var outputFunc = function(text) { return sample = text; };

describe('logger_test', function() {
  var logObj = null;
  var logObj2 = null;
  beforeEach(function() {
  	logObj = new logger("logger-tester");
  	sample = "";
  	return logObj.setOutput(outputFunc);
  });

  describe('.constructor', function() {
    return it('passing in parameters to constructor', function() {
      var formatter = function(data) { return data["level"] + "." + data["source"] + "." + data["title"]; };
      logObj = new logger("logger-test", logger.Info, formatter, outputFunc);
      logObj.debug("testlogdebug");
      var expected = "";
      assert.equal(sample, expected);

      logObj.info("testloginfo");
      expected = logger.Info + ".logger-test.testloginfo";
      return assert.equal(sample, expected);
    });
  });
  describe('.validateloglvl', function() {
    // Explicit validation checks
    it('is case-insensitive in log level name', function() {
      var logLvl = logObj._validateLogLvl("debug");
      assert.equal(logLvl, logger.Debug);
      logLvl = logObj._validateLogLvl("Debug");
      return assert.equal(logLvl, logger.Debug);
    });

    it('sets non-default log levels', function() {
      var logLvl = logObj._validateLogLvl("info");
      assert.equal(logLvl, logger.Info);
      // TODO: for each possible log level ...
      logLvl = logObj._validateLogLvl("critical");
      return assert.equal(logLvl, logger.Critical);
    });

    return it('sets level to Debug, if given an invalid log level', function() {
      var logLvl = logObj._validateLogLvl("sometest");
      return assert.equal(logLvl, logger.Debug);
    });
  });
  describe('.invalidlog', function() {
    return it('check valid debug level JSON output of invalid log level', function() {
      // Invalid log levels will default to debug
      logObj.setLogLevel("invalidloglevel");
      logObj.debug("testlogdebug");
      var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Debug + "\", \"title\": \"testlogdebug\"}";
      assert.deepEqual(JSON.parse(sample), JSON.parse(expected));

      logObj.setLogLevel("sometest");
      logObj.info("testloginfo");
      expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\"}";
      return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
    });
  });
  describe('.debug', function() {
  	it('test debug function', function() {
  	  logObj.debug("testlogdebug");
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Debug + "\", \"title\": \"testlogdebug\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  	return it('test debugD function', function() {
  	  logObj.debugD("testlogdebug", {"key1":"val1","key2":"val2"});
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Debug + "\", \"title\": \"testlogdebug\",\"key1\": \"val1\", \"key2\": \"val2\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  });

  describe('.info', function() {
  	it('test info function', function() {
  	  logObj.info("testloginfo");
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  	return it('test infoD function', function() {
  	  logObj.infoD("testloginfo", {"key1":"val1","key2":"val2"});

  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\",\"key1\": \"val1\", \"key2\": \"val2\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  });

  describe('.warning', function() {
  	it('test warn function', function() {
  	  logObj.warn("testlogwarning");
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Warning + "\", \"title\": \"testlogwarning\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  	return it('test warnD function', function() {
  	  logObj.warnD("testlogwarning", {"key1":"val1","key2":"val2"});
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Warning + "\", \"title\": \"testlogwarning\",\"key1\": \"val1\", \"key2\": \"val2\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  });

  describe('.error', function() {
  	it('test error function', function() {
  	  logObj.error("testlogerror");
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Error + "\", \"title\": \"testlogerror\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  	return it('test errorD function', function() {
  	  logObj.errorD("testlogerror", {"key1":"val1","key2":"val2"});
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Error + "\", \"title\": \"testlogerror\",\"key1\": \"val1\", \"key2\": \"val2\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  });

  describe('.critical', function() {
  	it('test critical function', function() {
  	  logObj.critical("testlogcritical");
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Critical + "\", \"title\": \"testlogcritical\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  	return it('test criticalD function', function() {
  	  logObj.criticalD("testlogcritical", {"key1":"val1","key2":"val2"});
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Critical + "\", \"title\": \"testlogcritical\",\"key1\": \"val1\", \"key2\": \"val2\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  });

  describe('.counter', function() {
  	it('test counter function', function() {
  	  logObj.counter("testlogcounter");
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testlogcounter\", \"type\": \"counter\", \"value\": 1}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  	return it('test counterD function', function() {
  	  logObj.counterD("testlogcounter", 2, {"key1":"val1","key2":"val2"});
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testlogcounter\",\"type\": \"counter\", \"value\": 2,\"key1\": \"val1\", \"key2\": \"val2\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  });

  describe('.gauge', function() {
  	it('test gauge function', function() {
  	  logObj.gauge("testloggauge", 0);
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloggauge\", \"type\": \"gauge\", \"value\": 0}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  	return it('test gaugeD function', function() {
  	  logObj.gaugeD("testloggauge", 4, {"key1":"val1","key2":"val2"});
  	  var expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloggauge\", \"type\": \"gauge\", \"value\": 4, \"key1\": \"val1\", \"key2\": \"val2\"}";
  	  return assert.deepEqual(JSON.parse(sample), JSON.parse(expected));
  });
  });

  describe('.diffoutput', function() {
    return it('output to different output functions using same logger', function() {
      logObj.info("testloginfo");
      var infoLog = sample;
      var output2 = "";
      var outputFunc2 = function(text) { return output2 = text; };
      logObj.setOutput(outputFunc2);
      logObj.warn("testlogwarning");
      assert.deepEqual(JSON.parse(infoLog), JSON.parse(sample));
      return assert.notDeepEqual(JSON.parse(output2), JSON.parse(sample));
    });
  });

  describe('.hiddenlog', function() {
    describe('.logwarning', function() {
      beforeEach(function() {
        return logObj.setLogLevel(logger.Warning);
      });
      it('empty cases due to log level', function() {
        logObj.debug("testlogdebug");
        assert.equal(sample, "");

        logObj.info("testloginfo");
        return assert.equal(sample, "");
      });
      return it('not empty cases due to log level', function() {
        logObj.warn("testlogwarning");
        assert.notDeepEqual(JSON.parse(sample), "");

        logObj.error("testlogerror");
        assert.notDeepEqual(JSON.parse(sample), "");

        logObj.critical("testlogcritical");
        return assert.notDeepEqual(JSON.parse(sample), "");
      });
    });
    return describe('.logcritical', function() {
      beforeEach(function() {
        return logObj.setLogLevel(logger.Critical);
      });
      it('empty cases due to log level', function() {
        logObj.debug("testlogdebug");
        assert.equal(sample, "");

        logObj.info("testloginfo");
        assert.equal(sample, "");

        logObj.warn("testlogwarning");
        assert.equal(sample, "");

        logObj.error("testlogerror");
        return assert.equal(sample, "");
      });
      return it('not empty cases due to log level', function() {
        logObj.critical("testlogcritical");
        return assert.notDeepEqual(JSON.parse(sample), "");
      });
    });
  });

  describe('.diffformat', function() {
    return it('use a different formatter than KV', function() {
      var testFormatter = function(data) { return "\"This is a test\""; };
      logObj.setFormatter(testFormatter);
      logObj.warn("testlogwarning");
      return assert.deepEqual(JSON.parse(sample), "This is a test");
    });
  });

  return describe('.multipleloggers', function() {
    before(function() {
      return logObj2 = new logger("logger-tester2");
    });
    it('log to same output buffer', function() {
      logObj2.setOutput(outputFunc);
      logObj.warn("testlogwarning");
      var output1 = sample;
      logObj2.info("testloginfo");
      return assert.notDeepEqual(JSON.parse(sample), JSON.parse(output1));
    });

    return it('log to different output buffer', function() {
      var output2 = "";
      var outputFunc2 = function(text) { return output2 = text; };
      logObj2.setOutput(outputFunc2);
      logObj.warn("testlogwarning");
      logObj2.info("testloginfo");

      var loggerExpected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Warning + "\", \"title\": \"testlogwarning\"}";
      assert.deepEqual(JSON.parse(sample), JSON.parse(loggerExpected));

      var logger2Expected = "{\"source\": \"logger-tester2\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\"}";
      return assert.deepEqual(JSON.parse(output2), JSON.parse(logger2Expected));
    });
  });
});
