const fs = require("fs");
const ZipModifier = require("./utils/zipModifier");

module.exports = class FileZipModifier {
  constructor({ verbose } = {}) {
    this.verbose = verbose;
  }

  async loadZip(params = {}) {
    this.params = params;
    const { path } = params;
    this.file = fs.readFileSync(path);
    this.zipModifier = new ZipModifier({ verbose: this.verbose });
    await this.zipModifier.loadZip(this.file);
    return this.zipModifier;
  }

  async saveZip(params = {}) {
    const modifiedZip = await this.zipModifier.exportZip();
    const destPath =
      params.path ||
      this.params.destPath ||
      this.params.path.replace(/^(.*?)(\.zip)?$/, "$1_modified$2");
    fs.writeFileSync(`./${destPath}`, modifiedZip);
    return { path: destPath };
  }
};
