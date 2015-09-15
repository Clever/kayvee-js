kv  = require "../lib/kayvee"
clog = require "../lib/clog/clog"
assert = require 'assert'
_ = require 'underscore'
_.mixin = require 'underscore.deep'
fs = require 'fs'

sample = ""
outputFunc = (text) -> sample = text

describe 'clog_test', ->
  logger = {}
  logger2 = {}
  beforeEach ->
  	logger = new clog("clog-tester")
  	sample = ""
  	logger.setOutput outputFunc

  describe '.constructor', ->
    it 'constructor', ->
      formatter = (data) -> data["level"] + "." + data["source"] + "." + data["title"]
      logger = new clog("clog-test", clog.Info, formatter, outputFunc)
      logger.debug "testlogdebug"
      expected = ""
      assert.equal sample, expected

      logger.info "testloginfo"
      expected = clog.Info + ".clog-test.testloginfo"
      assert.equal sample, expected
  describe '.invalidlog', ->
    it 'invalidlog', ->
      # Invalid log levels will default to debug
      logger.setLogLevel "debu"
      logger.debug "testlogdebug"
      expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Debug + "\", \"title\": \"testlogdebug\"}"
      assert.deepEqual JSON.parse(sample), JSON.parse(expected)

      logger.setLogLevel "sometest"
      logger.info "testloginfo"
      expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Info + "\", \"title\": \"testloginfo\"}"
      assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  describe '.debug', ->
  	it 'debug', ->
  	  logger.debug "testlogdebug"
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Debug + "\", \"title\": \"testlogdebug\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'debugD', ->
  	  logger.debugD "testlogdebug", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Debug + "\", \"title\": \"testlogdebug\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.info', ->
  	it 'info', ->
  	  logger.info "testloginfo"
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Info + "\", \"title\": \"testloginfo\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'infoD', ->
  	  logger.infoD "testloginfo", {"key1":"val1","key2":"val2"}

  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Info + "\", \"title\": \"testloginfo\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.warning', ->
  	it 'warn', ->
  	  logger.warn "testlogwarning"
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Warning + "\", \"title\": \"testlogwarning\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'warnD', ->
  	  logger.warnD "testlogwarning", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Warning + "\", \"title\": \"testlogwarning\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.error', ->
  	it 'error', ->
  	  logger.error "testlogerror"
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Error + "\", \"title\": \"testlogerror\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'errorD', ->
  	  logger.errorD "testlogerror", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Error + "\", \"title\": \"testlogerror\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.critical', ->
  	it 'critical', ->
  	  logger.critical "testlogcritical"
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Critical + "\", \"title\": \"testlogcritical\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'criticalD', ->
  	  logger.criticalD "testlogcritical", {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Critical + "\", \"title\": \"testlogcritical\",\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.counter', ->
  	it 'counter', ->
  	  logger.counter "testlogcounter"
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Info + "\", \"title\": \"testlogcounter\", \"type\": \"counter\", \"value\": 1}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'counterD', ->
  	  logger.counterD "testlogcounter", 2, {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Info + "\", \"title\": \"testlogcounter\",\"type\": \"counter\", \"value\": 2,\"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.gauge', ->
  	it 'gauge', ->
  	  logger.gauge "testloggauge", 0
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Info + "\", \"title\": \"testloggauge\", \"type\": \"gauge\", \"value\": 0}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)
  	it 'gaugeD', ->
  	  logger.gaugeD "testloggauge", 4, {"key1":"val1","key2":"val2"}
  	  expected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Info + "\", \"title\": \"testloggauge\", \"type\": \"gauge\", \"value\": 4, \"key1\": \"val1\", \"key2\": \"val2\"}"
  	  assert.deepEqual JSON.parse(sample), JSON.parse(expected)

  describe '.diffoutput', ->
    it 'diffoutput', ->
      logger.info "testloginfo"
      infoLog = sample
      output2 = ""
      outputFunc2 = (text) -> output2 = text
      logger.setOutput outputFunc2
      logger.warn "testlogwarning"
      assert.deepEqual JSON.parse(infoLog), JSON.parse(sample)
      assert.notDeepEqual JSON.parse(output2), JSON.parse(sample)

  describe '.hiddenlog', ->
    describe '.logwarning', ->
      beforeEach ->
        logger.setLogLevel clog.Warning
      it 'empty', ->
        logger.debug "testlogdebug"
        assert.equal sample, ""

        logger.info "testloginfo"
        assert.equal sample, ""
      it 'notempty', ->
        logger.warn "testlogwarning"
        assert.notDeepEqual JSON.parse(sample), ""

        logger.error "testlogerror"
        assert.notDeepEqual JSON.parse(sample), ""

        logger.critical "testlogcritical"
        assert.notDeepEqual JSON.parse(sample), ""
    describe '.logcritical', ->
      beforeEach ->
        logger.setLogLevel clog.Critical
      it 'empty', ->
        logger.debug "testlogdebug"
        assert.equal sample, ""

        logger.info "testloginfo"
        assert.equal sample, ""

        logger.warn "testlogwarning"
        assert.equal sample, ""

        logger.error "testlogerror"
        assert.equal sample, ""
      it 'notempty', ->
        logger.critical "testlogcritical"
        assert.notDeepEqual JSON.parse(sample), ""

  describe '.diffformat', ->
    it 'diffformat', ->
      testFormatter = (data) -> "\"This is a test\""
      logger.setFormatter testFormatter
      logger.warn "testlogwarning"
      assert.deepEqual JSON.parse(sample), "This is a test"

  describe '.multipleloggers', ->
    before ->
      logger2 = new clog("clog-tester2")
    it 'samebuffer', ->
      logger2.setOutput outputFunc
      logger.warn "testlogwarning"
      output1 = sample
      logger2.info "testloginfo"
      assert.notDeepEqual JSON.parse(sample), JSON.parse(output1)

    it 'diffbuffer', ->
      output2 = ""
      outputFunc2 = (text) -> output2 = text
      logger2.setOutput outputFunc2
      logger.warn "testlogwarning"
      logger2.info "testloginfo"

      loggerExpected = "{\"source\": \"clog-tester\", \"level\": \"" + clog.Warning + "\", \"title\": \"testlogwarning\"}"
      assert.deepEqual JSON.parse(sample), JSON.parse(loggerExpected)

      logger2Expected = "{\"source\": \"clog-tester2\", \"level\": \"" + clog.Info + "\", \"title\": \"testloginfo\"}"
      assert.deepEqual JSON.parse(output2), JSON.parse(logger2Expected)
