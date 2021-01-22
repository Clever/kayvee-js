var KayveeLogger = require("../lib/logger/logger");
var AnaLogger = require("../lib/analytics/analyticslogger");
var assert = require("assert");

let sampleOutput = "";
function sampleOutputFunc(text) {
  sampleOutput = text;
  return sampleOutput;
}

describe("logger_test", () => {
  let kvLogObj = null;
  let anLogObj = null;
  beforeEach(() => {
    kvLogObj = new KayveeLogger("logger-tester");
    kvLogObj.setOutput(sampleOutputFunc);
    anLogObj = new AnaLogger(kvLogObj, "stream-name", "");
  });

  describe(".constructor", () => {
    it("passing in parameters to constructor", () => {
      anLogObj.debugD({});
      let expected =
        '{"deploy_env":"testing","wf_id":"abc","level":"debug","source":"logger-tester","title":"stream-name"}';
      assert.equal(sampleOutput, expected);

      expected =
        '{"deploy_env":"testing","wf_id":"abc","level":"debug","source":"logger-tester","title":"testing--db-name"}';
      anLogObj = new AnaLogger(kvLogObj, "", "db-name");
      anLogObj.debugD({});
      assert.equal(sampleOutput, expected);

      assert.throws(() => {
        anLogObj = new AnaLogger(kvLogObj, "stream-name", "db-name");
      }, new Error("Exactly one of streamName and dbName should be specified"));
      assert.throws(() => {
        anLogObj = new AnaLogger(kvLogObj, "", "");
      }, new Error("Exactly one of streamName and dbName should be specified"));
    });
  });

  describe(".debug", () => {
    it("test debugD function", () => {
      anLogObj.debugD({ key1: "val1", key2: "val2" });
      const expected = `{"deploy_env": "testing", "wf_id": "abc", "source": "logger-tester",
"level": "${KayveeLogger.Debug}", "title": "stream-name","key1": "val1", "key2": "val2"}`;
      assert.deepEqual(JSON.parse(sampleOutput), JSON.parse(expected));
    });
  });

  describe(".info", () => {
    it("test infoD function", () => {
      anLogObj.infoD({ key1: "val1", key2: "val2" });
      const expected = `{"deploy_env": "testing", "wf_id": "abc", "source": "logger-tester",
"level": "${KayveeLogger.Info}", "title": "stream-name","key1": "val1", "key2": "val2"}`;
      assert.deepEqual(JSON.parse(sampleOutput), JSON.parse(expected));
    });
  });

  describe(".warning", () => {
    it("test warnD function", () => {
      anLogObj.warnD({ key1: "val1", key2: "val2" });
      const expected = `{"deploy_env": "testing", "wf_id": "abc", "source": "logger-tester",
"level": "${KayveeLogger.Warning}", "title": "stream-name","key1": "val1", "key2": "val2"}`;
      assert.deepEqual(JSON.parse(sampleOutput), JSON.parse(expected));
    });
  });

  describe(".error", () => {
    it("test errorD function", () => {
      anLogObj.errorD({ key1: "val1", key2: "val2" });
      const expected = `{"deploy_env": "testing", "wf_id": "abc", "source": "logger-tester",
"level": "${KayveeLogger.Error}", "title": "stream-name","key1": "val1", "key2": "val2"}`;
      assert.deepEqual(JSON.parse(sampleOutput), JSON.parse(expected));
    });
  });

  describe(".critical", () => {
    it("test criticalD function", () => {
      anLogObj.criticalD({ key1: "val1", key2: "val2" });
      const expected = `{"deploy_env": "testing", "wf_id": "abc", "source": "logger-tester",
"level": "${KayveeLogger.Critical}", "title": "stream-name","key1": "val1", "key2": "val2"}`;
      assert.deepEqual(JSON.parse(sampleOutput), JSON.parse(expected));
    });
  });
});
