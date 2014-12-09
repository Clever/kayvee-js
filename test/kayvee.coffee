kv  = require "../lib/kayvee"
assert = require 'assert'
_ = require 'underscore'
_.mixin = require 'underscore.deep'
fs = require 'fs'

describe 'kayvee', ->

  tests = JSON.parse fs.readFileSync "test/tests.json"
  describe '.format', ->
    _.each tests['format'], (spec) ->
      it spec.title, ->
        actual = kv.format spec.input.data
        expected = spec.output
        assert.deepEqual JSON.parse(actual), JSON.parse(expected)

  describe '.formatLog', ->
    _.each tests['formatLog'], (spec) ->
      it spec.title, ->
        actual = kv.formatLog spec.input.source, spec.input.level, spec.input.title, spec.input.data
        expected = spec.output
        assert.deepEqual JSON.parse(actual), JSON.parse(expected)
