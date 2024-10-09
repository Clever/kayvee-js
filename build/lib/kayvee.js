var _ = require("underscore");
const deploy_env = process.env._DEPLOY_ENV;
const workflow_id = process.env._EXECUTION_NAME;
const pod_id = process.env._POD_ID;
const pod_shortname = process.env._POD_SHORTNAME;
const pod_region = process.env._POD_REGION;
const pod_account = process.env._POD_ACCOUNT;
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
        const extras = {};
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
function formatLog(source = "", level = "", title = "", data = {}) {
    let info = data;
    if (!_.isObject(data)) {
        info = {};
    }
    const reserved = { source, level, title };
    // reserved keys overwrite other keys in data
    return format(_.extend({}, info, reserved));
}
module.exports = {
    format,
    formatLog,
};
const LOG_LEVELS = {
    UNKNOWN: "unknown",
    CRITICAL: "critical",
    ERROR: "error",
    WARNING: "warning",
    INFO: "info",
    TRACE: "trace",
};
_.extend(module.exports, LOG_LEVELS);
