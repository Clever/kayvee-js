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
    it 'constructor', ->
      formatter = (data) -> data["level"] + "." + data["source"] + "." + data["title"]
      logObj = new logger("logger-test", logger.Info, formatter, outputFunc)
      logObj.debug "testlogdebug"
      expected = ""
      assert.equal sample, expected

      logObj.info "testloginfo"
      expected = logger.Info + ".logger-test.testloginfo"
      assert.equal sample, expected
  describe '.validatelog', ->
    # Explicit validation checks
    it 'validatelog', ->
      logLvl = logObj._validateLogLvl "debug"
      assert.equal logLvl, logger.Debug
      logLvl = logObj._validateLogLvl "Debug"
      assert.equal logLvl, logger.Debug

      logLvl = logObj._validateLogLvl "info"
      assert.equal logLvl, logger.Info
      logLvl = logObj._validateLogLvl "Info"
      assert.equal logLvl, logger.Info

      logLvl = logObj._validateLogLvl "sometest"
      assert.equal logLvl, logger.Debug
  describe '.invalidlog', ->
    it 'invalidlog', ->
      # Invalid log levels will default to debug
      logObj.setLogLevel "debu"
      logObj.debug "testlogdebug"
      expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Debug + "\", \"title\": \"testlogdebug\"}"
      assert.deepEqual JSON.parse(sample), JSON.parse(expected)

      logObj.setLogLevel "sometest"
      logObj.info "testloginfo"
      expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\"}"
      assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  describe '.debug', ->
  	it 'debug', ->
  	  logObj.debug "testlogdebug"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Debug + "\", \"title\": \"testlogdebug\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'debugD', ->
  	  logObj.debugD "testlogdebug", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Debug + "\", \"title\": \"testlogdebug\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.info', ->
  	it 'info', ->
  	  logObj.info "testloginfo"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'infoD', ->
  	  logObj.infoD "testloginfo", {"key1":"val1","key2":"val2"}

  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.warning', ->
  	it 'warn', ->
  	  logObj.warn "testlogwarning"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Warning + "\", \"title\": \"testlogwarning\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'warnD', ->
  	  logObj.warnD "testlogwarning", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Warning + "\", \"title\": \"testlogwarning\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.error', ->
  	it 'error', ->
  	  logObj.error "testlogerror"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Error + "\", \"title\": \"testlogerror\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'errorD', ->
  	  logObj.errorD "testlogerror", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Error + "\", \"title\": \"testlogerror\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.critical', ->
  	it 'critical', ->
  	  logObj.critical "testlogcritical"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Critical + "\", \"title\": \"testlogcritical\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'criticalD', ->
  	  logObj.criticalD "testlogcritical", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Critical + "\", \"title\": \"testlogcritical\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.counter', ->
  	it 'counter', ->
  	  logObj.counter "testlogcounter"
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testlogcounter\", \"type\": \"counter\", \"value\": 1}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'counterD', ->
  	  logObj.counterD "testlogcounter", 2, {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testlogcounter\",\"type\": \"counter\", \"value\": 2,\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.gauge', ->
  	it 'gauge', ->
  	  logObj.gauge "testloggauge", 0
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloggauge\", \"type\": \"gauge\", \"value\": 0}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'gaugeD', ->
  	  logObj.gaugeD "testloggauge", 4, {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Info + "\", \"title\": \"testloggauge\", \"type\": \"gauge\", \"value\": 4, \"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.diffoutput', ->
    it 'diffoutput', ->
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
      it 'empty', ->
        logObj.debug "testlogdebug"
        assert.equal sample, ""

        logObj.info "testloginfo"
        assert.equal sample, ""
      it 'notempty', ->
        logObj.warn "testlogwarning"
        assert.notDeepEqual JSON.parse(sample), ""

        logObj.error "testlogerror"
        assert.notDeepEqual JSON.parse(sample), ""

        logObj.critical "testlogcritical"
        assert.notDeepEqual JSON.parse(sample), ""
    describe '.logcritical', ->
      beforeEach ->
        logObj.setLogLevel logger.Critical
      it 'empty', ->
        logObj.debug "testlogdebug"
        assert.equal sample, ""

        logObj.info "testloginfo"
        assert.equal sample, ""

        logObj.warn "testlogwarning"
        assert.equal sample, ""

        logObj.error "testlogerror"
        assert.equal sample, ""
      it 'notempty', ->
        logObj.critical "testlogcritical"
        assert.notDeepEqual JSON.parse(sample), ""

  describe '.diffformat', ->
    it 'diffformat', ->
      testFormatter = (data) -> "\"This is a test\""
      logObj.setFormatter testFormatter
      logObj.warn "testlogwarning"
      assert.deepEqual JSON.parse(sample), "This is a test"

  describe '.multipleloggers', ->
    before ->
      logObj2 = new logger("logger-tester2")
    it 'samebuffer', ->
      logObj2.setOutput outputFunc
      logObj.warn "testlogwarning"
      output1 = sample
      logObj2.info "testloginfo"
      assert.notDeepEqual JSON.parse(sample), JSON.parse(output1)

    it 'diffbuffer', ->
      output2 = ""
      outputFunc2 = (text) -> output2 = text
      logObj2.setOutput outputFunc2
      logObj.warn "testlogwarning"
      logObj2.info "testloginfo"

      loggerExpected = "{\"source\": \"logger-tester\", \"level\": \"" + logger.Warning + "\", \"title\": \"testlogwarning\"}"
      assert.deepEqual JSON.parse(sample), JSON.parse(loggerExpected)

      logger2Expected = "{\"source\": \"logger-tester2\", \"level\": \"" + logger.Info + "\", \"title\": \"testloginfo\"}"
      assert.deepEqual JSON.parse(output2), JSON.parse(logger2Expected)
