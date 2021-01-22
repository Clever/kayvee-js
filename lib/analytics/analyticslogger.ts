import { Logger } from "../logger/logger";

// This is a port from kayvee-go/logger/analytics/logger.go
export class AnalyticsLogger {
  logger: Logger = null;
  streamName: string = null;
  errLogger: Logger = null;

  constructor(logger: Logger, streamName: string, dbName: string, errLogger: Logger = null) {
    this.logger = logger;
    if (streamName === "" && dbName !== "") {
      this.streamName = `${process.env._DEPLOY_ENV}--${dbName}`;
    } else if (streamName !== "" && dbName === "") {
      this.streamName = streamName;
    } else {
      throw new Error("Exactly one of streamName and dbName should be specified");
    }
    this.errLogger = errLogger;
  }

  debugD(data) {
    this.logger.debugD(this.streamName, data);
  }

  infoD(data) {
    this.logger.infoD(this.streamName, data);
  }

  warnD(data) {
    this.logger.warnD(this.streamName, data);
  }

  errorD(data) {
    this.logger.errorD(this.streamName, data);
  }

  criticalD(data) {
    this.logger.criticalD(this.streamName, data);
  }
}

module.exports = AnalyticsLogger;
