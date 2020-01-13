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

  async addFile(path, content) {
    return this.zipData.file(path, await content);
  }

  async removeFile(path) {
    return this.zipData.remove(path);
  }

  async copyFile(origPath, destPath) {
    const origFile = this.zipData.file(origPath);
    if (origFile) {
      this.zipData.file(destPath, await fileContents(origFile));
      return this.zipData.file(destPath);
    }
  }

  async getFiles(path) {
    return Promise.all(
      [].concat(this.zipData.file(path) || []).map(fileContents)
    );
  }

  async fileContents(file, type = "string") {
    return fileContents(file, type);
  }

  async exportZip() {
    return this.zipData.generateAsync(COMPRESSION_OPTIONS);
  }
};

async function readZipFromData(data) {
  return await new JSZip().loadAsync(data, { createFolders: true });
}

async function fileContents(file, type = "string") {
  if (file) {
    return await file.async(type);
  } else {
    return "";
  }
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
      const initialContent = await fileContents(file);
      // run modifiers
      const result = await filteredModifiers.reduce(
        async (content, { modifier }) => modifier(await content, relativePath),
        Promise.resolve(initialContent)
      );

      if (typeof result === "string" && result !== initialContent) {
        // update zip file
        logMessage("info", "modifying", relativePath);
        zipData.file(relativePath, result);
      } else if (!result) {
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
