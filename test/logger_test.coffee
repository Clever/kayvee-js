kv  = require "../lib/kayvee"
logger = require "../lib/logger/logger"
assert = require 'assert'
_ = require 'underscore'
_.mixin = require 'underscore.deep'
fs = require 'fs'

sample = ""
outputFunc = (text) -> sample = text

describe 'logger_test', ->
  logObj = {}
  logObj2 = {}
  beforeEach ->
  	logObj = new logger("logger-tester")
  	sample = ""
  	logObj.setOutput outputFunc

  describe '.constructor', ->
    it 'passing in parameters to constructor', ->
      formatter = (data) -> data["level"] + "." + data["source"] + "." + data["title"]
      logObj = new logger("logger-test", logger.Info, formatter, outputFunc)
      logObj.debug "testlogdebug"
      expected = ""
      assert.equal sample, expected

      logObj.info "testloginfo"
      expected = logger.Info + ".logger-test.testloginfo"
      assert.equal sample, expected
  describe '.validateloglvl', ->
    # Explicit validation checks
    it 'is case-insensitive in log level name', ->
      logLvl = logObj._validateLogLvl "debug"
      assert.equal logLvl, logger.Debug
      logLvl = logObj._validateLogLvl "Debug"
      assert.equal logLvl, logger.Debug

    it 'sets non-default log levels', ->
      logLvl = logObj._validateLogLvl "info"
      assert.equal logLvl, logger.Info
      # TODO: for each possible log level ...
      logLvl = logObj._validateLogLvl "critical"
      assert.equal logLvl, logger.Critical

    it 'sets level to Debug, if given an invalid log level', ->
      logLvl = logObj._validateLogLvl "sometest"
      assert.equal logLvl, logger.Debug
  describe '.invalidlog', ->
    it 'check valid debug level JSON output of invalid log level', ->
      # Invalid log levels will default to debug
      logObj.setLogLevel "invalidloglevel"
      logObj.debug "testlogdebug"
      expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Debug + "\", \"title\": \"testlogdebug\"}"
      assert.deepEqual JSON.parse(sample), JSON.parse(expected)

      logObj.setLogLevel "sometest"
      logObj.info "testloginfo"
      expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\"}"
      assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  describe '.debug', ->
  	it 'test debug function', ->
  	  logObj.debug "testlogdebug"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Debug + "\", \"title\": \"testlogdebug\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'test debugD function', ->
  	  logObj.debugD "testlogdebug", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Debug + "\", \"title\": \"testlogdebug\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.info', ->
  	it 'test info function', ->
  	  logObj.info "testloginfo"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'test infoD function', ->
  	  logObj.infoD "testloginfo", {"key1":"val1","key2":"val2"}

  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.warning', ->
  	it 'test warn function', ->
  	  logObj.warn "testlogwarning"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Warning + "\", \"title\": \"testlogwarning\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'test warnD function', ->
  	  logObj.warnD "testlogwarning", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Warning + "\", \"title\": \"testlogwarning\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.error', ->
  	it 'test error function', ->
  	  logObj.error "testlogerror"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Error + "\", \"title\": \"testlogerror\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'test errorD function', ->
  	  logObj.errorD "testlogerror", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Error + "\", \"title\": \"testlogerror\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.critical', ->
  	it 'test critical function', ->
  	  logObj.critical "testlogcritical"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Critical + "\", \"title\": \"testlogcritical\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'test criticalD function', ->
  	  logObj.criticalD "testlogcritical", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Critical + "\", \"title\": \"testlogcritical\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.counter', ->
  	it 'test counter function', ->
  	  logObj.counter "testlogcounter"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testlogcounter\", \"type\": \"counter\", \"value\": 1}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'test counterD function', ->
  	  logObj.counterD "testlogcounter", 2, {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testlogcounter\",\"type\": \"counter\", \"value\": 2,\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.gauge', ->
  	it 'test gauge function', ->
  	  logObj.gauge "testloggauge", 0
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloggauge\", \"type\": \"gauge\", \"value\": 0}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'test gaugeD function', ->
  	  logObj.gaugeD "testloggauge", 4, {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloggauge\", \"type\": \"gauge\", \"value\": 4, \"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.diffoutput', ->
    it 'output to different output functions using same logger', ->
      logObj.info "testloginfo"
      infoLog = sample
      output2 = ""
      outputFunc2 = (text) -> output2 = text
      logObj.setOutput outputFunc2
      logObj.warn "testlogwarning"
      assert.deepEqual JSON.parse(infoLog), JSON.parse(sample)
      assert.notDeepEqual JSON.parse(output2), JSON.parse(sample)

  describe '.hiddenlog', ->
    describe '.logwarning', ->
      beforeEach ->
        logObj.setLogLevel logger.Warning
      it 'empty cases due to log level', ->
        logObj.debug "testlogdebug"
        assert.equal sample, ""

        logObj.info "testloginfo"
        assert.equal sample, ""
      it 'not empty cases due to log level', ->
        logObj.warn "testlogwarning"
        assert.notDeepEqual JSON.parse(sample), ""

        logObj.error "testlogerror"
        assert.notDeepEqual JSON.parse(sample), ""

        logObj.critical "testlogcritical"
        assert.notDeepEqual JSON.parse(sample), ""
    describe '.logcritical', ->
      beforeEach ->
        logObj.setLogLevel logger.Critical
      it 'empty cases due to log level', ->
        logObj.debug "testlogdebug"
        assert.equal sample, ""

        logObj.info "testloginfo"
        assert.equal sample, ""

        logObj.warn "testlogwarning"
        assert.equal sample, ""

        logObj.error "testlogerror"
        assert.equal sample, ""
      it 'not empty cases due to log level', ->
        logObj.critical "testlogcritical"
        assert.notDeepEqual JSON.parse(sample), ""

  describe '.diffformat', ->
    it 'use a different formatter than KV', ->
      testFormatter = (data) -> "\"This is a test\""
      logObj.setFormatter testFormatter
      logObj.warn "testlogwarning"
      assert.deepEqual JSON.parse(sample), "This is a test"

  describe '.multipleloggers', ->
    before ->
      logObj2 = new logger("logger-tester2")
    it 'log to same output buffer', ->
      logObj2.setOutput outputFunc
      logObj.warn "testlogwarning"
      output1 = sample
      logObj2.info "testloginfo"
      assert.notDeepEqual JSON.parse(sample), JSON.parse(output1)

    it 'log to different output buffer', ->
      output2 = ""
      outputFunc2 = (text) -> output2 = text
      logObj2.setOutput outputFunc2
      logObj.warn "testlogwarning"
      logObj2.info "testloginfo"

      loggerExpected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Warning + "\", \"title\": \"testlogwarning\"}"
      assert.deepEqual JSON.parse(sample), JSON.parse(loggerExpected)

      logger2Expected = "{\"source\": \"logger-tester2\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\"}"
      assert.deepEqual JSON.parse(output2), JSON.parse(logger2Expected)
