kv  = require "../lib/kayvee"
assert = require 'assert'
_ = require 'underscore'
fs = require 'fs'

describe 'kayvee', ->

  describe '.format', ->
    tests = JSON.parse fs.readFileSync "test/tests.json"
    _.each tests['format'], (spec) ->
      # TODO: include the test name in the json spec
      # Put exact expected output, unless all this sorting stuff is removed from spec
      it "outputs expected 'kev=val ...' pairs", ->
        actual = kv.format spec.input
        expected = spec.output
        assert.equal actual, expected

  describe '.formatLog', ->
    it "outputs reserved fields", ->
      actual = kv.formatLog "SOURCE", kv.ERROR, "BAD_THINGS_HAPPENING", {}
      expected = 'source="SOURCE" level="error" title="BAD_THINGS_HAPPENING"'
      assert.equal actual, expected

    it "outputs reserved fields and sorted data", ->
      actual = kv.formatLog "SOURCE", kv.WARNING, "BAD_THINGS_HAPPENING", {foo: "bar", baz: "boo"}
      expected = 'source="SOURCE" level="warning" title="BAD_THINGS_HAPPENING" baz="boo" foo="bar"'
      assert.equal actual, expected

    it "outputs reserved fields, even if undefined ", ->
      actual = kv.formatLog undefined, undefined, undefined, undefined
      expected = 'source=undefined level=undefined title=undefined'
      assert.equal actual, expected
