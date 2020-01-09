const aws = require("aws-sdk");
const ZipModifier = require("./utils/zipModifier");
const s3 = new aws.S3();

module.exports = class S3ZipModifier {
  constructor({ verbose } = {}) {
    this.verbose = verbose;
  }

  async loadZip(s3LocationParams = {}) {
    this.s3LocationParams = s3LocationParams;
    const { bucket, key } = s3LocationParams;
    const data = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    this.file = data.Body;
    this.zipModifier = new ZipModifier({ verbose: this.verbose });
    await this.zipModifier.loadZip(this.file);
    return this.zipModifier;
  }

  async saveZip(options = {}) {
    const modifiedZip = await this.zipModifier.exportZip();
    const destBucket =
      options.bucket ||
      this.s3LocationParams.destBucket ||
      this.s3LocationParams.bucket;
    const destKey =
      options.key ||
      this.s3LocationParams.destKey ||
      `${this.s3LocationParams.key}_modified`;
    await s3
      .putObject({ Bucket: destBucket, Key: destKey, Body: modifiedZip })
      .promise();
    return { bucket: destBucket, key: destKey };
  }
};
