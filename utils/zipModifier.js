const JSZip = require("jszip");

const COMPRESSION_OPTIONS = {
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: {
    level: 9
  }
};

module.exports = class ZipModifier {
  constructor({ verbose } = {}) {
    this.verbose = verbose;
  }

  async loadZip(zipFileContents) {
    this.zipData = await readZipFromData(zipFileContents);
  }

  async modifyFiles(predicate, modifier) {
    await this.iterateAllFiles([
      {
        test: predicate,
        modifier
      }
    ]);
  }

  async iterateAllFiles(modifiers) {
    await itearateZip(this.zipData, modifiers, this.verbose);
  }

  async exportZip() {
    return this.zipData.generateAsync(COMPRESSION_OPTIONS);
  }
};

async function readZipFromData(data) {
  return await new JSZip().loadAsync(data, { createFolders: true });
}

async function itearateZip(zipData, modifiers = [], verbose = false) {
  const modifiersData = [].concat(modifiers);
  const arr = [];

  zipData.forEach(function(relativePath, file) {
    arr.push({ relativePath, file });
  });

  await arr.reduce(async (acc, { relativePath, file }) => {
    await acc;
    verbose && console.log("iterating", relativePath);
    // check if a modifier requires this file
    const filteredModifiers = modifiersData.filter(
      ({ test }) => !!test(relativePath)
    );
    if (filteredModifiers.length) {
      verbose && console.log("modifying", relativePath);
      const initialContent = await file.async("string");
      // run modifiers
      const result = filteredModifiers.reduce(
        (content, { modifier }) => modifier(content, relativePath),
        initialContent
      );
      if (result) {
        // update zip file
        zipData.file(relativePath, result);
      } else {
        zipData.remove(relativePath);
      }
    }
  }, Promise.resolve());
}
