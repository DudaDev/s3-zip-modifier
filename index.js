const aws = require("aws-sdk");
const ZipModifier = require('@dudadev/zip-modifier');
const s3 = new aws.S3();

module.exports = class S3ZipModifier {
    async loadFromS3(event = {}) {
        this.event = event;
        const { bucket, key } = event;
        const data = await s3.getObject({ Bucket: bucket, Key: key }).promise();
        this.file = data.Body;
        this.zipModifier = new ZipModifier();
        await this.zipModifier.loadZip(this.file);
        return this.zipModifier;
    }

    async saveToS3(options = {}) {
        const modifiedZip = await this.zipModifier.exportZip();
        const destBucket = options.bucket || this.event.destBucket || this.event.bucket;
        const destKey = options.key || this.event.destKey || `${this.event.key}_modified`;
        await s3.putObject({ Bucket: destBucket, Key: destKey, Body: modifiedZip }).promise();
        return { bucket: destBucket, key: destKey };
    }
}