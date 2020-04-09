import * as AWS from "aws-sdk";
import {Mutex, MutexInterface} from 'async-mutex';

// Ported from kayvee-go/logger/analyticslogger.go

// firehosePutRecordBatchMaxRecords is an AWS limit.
// https://docs.aws.amazon.com/firehose/latest/APIReference/API_PutRecordBatch.html
const firehosePutRecordBatchMaxRecords = 500

// firehosePutRecordBatchMaxBytes is an AWS limit on total bytes in a PutRecordBatch request.
// https://docs.aws.amazon.com/firehose/latest/APIReference/API_PutRecordBatch.html
const firehosePutRecordBatchMaxBytes = 4000000

class AnalyticsLogger extends Logger {
  fhStream: string;
  batchMaxRecords: number;
  batchMaxBytes: number;
  firehoseAPI: AWS.Firehose;
  batch: AWS.Firehose.PutRecordBatchRequestEntryList;
  batchBytes: number;
  mu: MutexInterface;

  constructor(source: string, environment: string, dbname: string, region: string = process.env._POD_REGION, batchMaxRecords: number = firehosePutRecordBatchMaxRecords, batchMaxBytes: number = firehosePutRecordBatchMaxBytes, firehoseAPI: AWS.Firehose = null) {
    super(source);
    this.fhStream = `${environment}--${dbname}`;
    this.batchMaxRecords = Math.min(batchMaxRecords, firehosePutRecordBatchMaxRecords);
    this.batchMaxBytes = Math.min(batchMaxBytes, firehosePutRecordBatchMaxBytes);
    if (firehoseAPI != null) {
      this.firehoseAPI = firehoseAPI;
    } else {
      this.firehoseAPI = new AWS.Firehose({region: region});
    }
    this.mu = new Mutex();

    this.setOutput(this.write);
  }

  async write(msg: string) {
    const release = await this.mu.acquire();
    try {
        this.batch.push({Data: msg});
        this.batchBytes += (new TextEncoder().encode(msg)).length;

        if (this.batch.length == this.batchMaxRecords || this.batchBytes > this.batchMaxBytes * 0.9) {
          this.sendBatch();
        }
    } finally {
        release();
    }
  }

  sendBatch() {
    var batch = this.batch;
    while (batch.length != 0) {
      var params = {
        DeliveryStreamName: this.fhStream,
        Records: batch
      };
      this.firehoseAPI.putRecordBatch(params, function(err, data) {
        if (err) {
          console.error(err, err.stack);
          batch = [];
        } else if (data.FailedPutCount == 0) {
          batch = [];
        } else {
          var newBatch: AWS.Firehose.PutRecordBatchRequestEntryList;
          newBatch = [];
          for (var i = 0; i < batch.length; i++) {
            if (data.RequestResponses[i].ErrorCode != "") {
              newBatch.push(batch[i])
            }
          }
          batch = newBatch;
        }
      });
    }
    this.batch = batch;
    this.batchBytes = 0;
  }
}
