var kv  = require("../lib/kayvee");
var assert = require('assert');
var _ = require('underscore');
_.mixin = require('underscore.deep');
var fs = require('fs');

describe('kayvee', function() {

  var tests = JSON.parse(fs.readFileSync("test/tests.json"));
  describe('.format', function() {
    return _.each(tests['format'], function(spec) {
      return it(spec.title, function() {
        var actual = kv.format(spec.input.data);
        var expected = spec.output;
        return assert.deepEqual(JSON.parse(actual), JSON.parse(expected));
      });
    });
  });

  return describe('.formatLog', function() {
    return _.each(tests['formatLog'], function(spec) {
      return it(spec.title, function() {
        var actual = kv.formatLog(spec.input.source, spec.input.level, spec.input.title, spec.input.data);
        var expected = spec.output;
        return assert.deepEqual(JSON.parse(actual), JSON.parse(expected));
      });
    });
  });
});
