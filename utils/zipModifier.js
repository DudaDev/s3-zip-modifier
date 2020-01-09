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

  async modifyFiles(test, modifier) {
    await this.iterateAllFiles([{ test, modifier }]);
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
  const logMessage = log.bind(null, verbose);
  const modifiersData = [].concat(modifiers);
  const arr = [];

  zipData.forEach(function(relativePath, file) {
    arr.push({ relativePath, file });
  });

  await arr.reduce(async (acc, { relativePath, file }) => {
    await acc;
    logMessage("debug", "iterating", relativePath);
    // check if a modifier requires this file
    const filteredModifiers = modifiersData.filter(
      ({ test }) => !!test(relativePath)
    );
    if (filteredModifiers.length) {
      const initialContent = await file.async("string");
      // run modifiers
      const result = filteredModifiers.reduce(
        (content, { modifier }) => modifier(content, relativePath),
        initialContent
      );
      if (result !== initialContent) {
        // update zip file
        logMessage("info", "modifying", relativePath);
        zipData.file(relativePath, result);
      } else if (result === null || result === "") {
        logMessage("info", "removing", relativePath);
        zipData.remove(relativePath);
      }
    }
  }, Promise.resolve());
}

function log(verbose, level, ...messages) {
  if (!verbose) {
    return;
  }
  if (verbose === "minimal") {
    if (level !== "debug") {
      console.log(...messages);
    }
  } else {
    console.log(...messages);
  }
}
