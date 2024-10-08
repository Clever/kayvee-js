var _ = require("underscore");
var deploy_env = process.env._DEPLOY_ENV;
var workflow_id = process.env._EXECUTION_NAME;
var pod_id = process.env._POD_ID;
var pod_shortname = process.env._POD_SHORTNAME;
var pod_region = process.env._POD_REGION;
var pod_account = process.env._POD_ACCOUNT;
// Encode errors to strings instead of toJSON()
function replaceErrors(key, value) {
    if (value instanceof Error) {
        return value.toString();
    }
    return value;
}
// Converts a map to a string space-delimited key=val pairs
function format(data) {
    if (deploy_env || workflow_id || pod_id || pod_shortname || pod_account || pod_region) {
        var extras = {};
        if (deploy_env) {
            extras.deploy_env = deploy_env;
        }
        if (workflow_id) {
            extras.wf_id = workflow_id;
        }
        if (pod_id) {
            extras["pod-id"] = pod_id;
        }
        if (pod_shortname) {
            extras["pod-shortname"] = pod_shortname;
        }
        if (pod_region) {
            extras["pod-region"] = pod_region;
        }
        if (pod_account) {
            extras["pod-account"] = pod_account;
        }
        return JSON.stringify(_.extend(extras, data), replaceErrors);
    }
    return JSON.stringify(data, replaceErrors);
}
// Similar to format, but takes additional reserved params to promote logging best-practices
function formatLog(source, level, title, data) {
    if (source === void 0) { source = ""; }
    if (level === void 0) { level = ""; }
    if (title === void 0) { title = ""; }
    if (data === void 0) { data = {}; }
    var info = data;
    if (!_.isObject(data)) {
        info = {};
    }
    var reserved = { source: source, level: level, title: title };
    // reserved keys overwrite other keys in data
    return format(_.extend({}, info, reserved));
}
module.exports = {
    format: format,
    formatLog: formatLog,
};
var LOG_LEVELS = {
    UNKNOWN: "unknown",
    CRITICAL: "critical",
    ERROR: "error",
    WARNING: "warning",
    INFO: "info",
    TRACE: "trace",
};
_.extend(module.exports, LOG_LEVELS);
