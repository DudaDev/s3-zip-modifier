const aws = require("aws-sdk");
const ZipModifier = require('@dudadev/zip-modifier');
const s3 = new aws.S3();

module.exports = class S3ZipModifier {
    async loadFromS3({ bucket, key}) {
        const data = await s3.getObject({ Bucket: bucket, Key: key }).promise();
        this.file = data.Body;
        this.zipModifier = new ZipModifier();
        await this.zipModifier.loadZip(this.file);
        return this.zipModifier;
    }

    async saveToS3({ bucket, key }) {
        const modifiedZip = await this.zipModifier.exportZip();
        await s3.putObject({ Bucket: bucket, Key: key, Body: modifiedZip }).promise();
    }
}