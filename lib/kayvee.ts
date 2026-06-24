const deploy_env = process.env._DEPLOY_ENV;
const workflow_id = process.env._EXECUTION_NAME;
const pod_id = process.env._POD_ID;
const pod_shortname = process.env._POD_SHORTNAME;
const pod_region = process.env._POD_REGION;
const pod_account = process.env._POD_ACCOUNT;

function replaceErrors(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return value.toString();
  }
  return value;
}

export function format(data: Record<string, unknown>): string {
  if (deploy_env || workflow_id || pod_id || pod_shortname || pod_account || pod_region) {
    const extras: Record<string, string> = {};
    if (deploy_env) extras.deploy_env = deploy_env;
    if (workflow_id) extras.wf_id = workflow_id;
    if (pod_id) extras["pod-id"] = pod_id;
    if (pod_shortname) extras["pod-shortname"] = pod_shortname;
    if (pod_region) extras["pod-region"] = pod_region;
    if (pod_account) extras["pod-account"] = pod_account;
    return JSON.stringify(Object.assign(extras, data), replaceErrors);
  }
  return JSON.stringify(data, replaceErrors);
}

export function formatLog(
  source = "",
  level = "",
  title = "",
  data: Record<string, unknown> = {},
): string {
  const info = typeof data === "object" && data !== null ? data : {};
  const reserved = { source, level, title };
  return format(Object.assign({}, info, reserved));
}

export const LOG_LEVELS = {
  UNKNOWN: "unknown",
  CRITICAL: "critical",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
  TRACE: "trace",
} as const;

export const { UNKNOWN, CRITICAL, ERROR, WARNING, INFO, TRACE } = LOG_LEVELS;
