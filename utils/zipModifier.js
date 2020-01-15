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
    this.log = log.bind(null, this.verbose);
  }

  async loadZip(zipFileContents) {
    this.zipData = await readZipFromData(zipFileContents);
  }

  async modifyFiles(test, modifier, message = "") {
    await this.iterateAllFiles([{ test, modifier, message }]);
  }

  async iterateAllFiles(modifiers) {
    await itearateZip(this.zipData, modifiers, this.verbose);
  }

  async addFile(path, content, message = "") {
    this.log(["adding", path, message]);
    return this.zipData.file(path, await content);
  }

  async removeFile(path, message = "") {
    return this.modifyFiles(path, () => "", message);
  }

  async copyFile(origPath, destPathCreator) {
    const data = {};
    await this.modifyFiles(origPath, async (contents, filePath) => {
      const destPath =
        typeof destPathCreator === "function"
          ? destPathCreator(filePath)
          : destPathCreator;
      if (destPath) {
        data[filePath] = [destPath, contents];
      }
    });
    Object.entries(data).forEach(([filePath, [destPath, contents]]) => {
      this.zipData.file(destPath, contents);
      this.log(["copying", filePath, "->", destPath]);
    })
  }

  async getFiles(path) {
    return Promise.all(
      [].concat(this.zipData.file(path) || []).map(fileContents)
    );
  }

  async fileContents(file, type) {
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
    logMessage(["iterating", relativePath], "debug");
    // check if a modifier requires this file
    const filteredModifiers = modifiersData.filter(({ test }) =>
      testPath(test, relativePath)
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
        logMessage([
          "modifying",
          relativePath,
          `(${filteredModifiers.map(mod => mod.message || "modifier").join("->")})`
        ]);
        zipData.file(relativePath, result);
      } else if (result === "" || result === null) {
        logMessage(["removing", relativePath]);
        zipData.remove(relativePath);
      }
    }
  }, Promise.resolve());
}

function testPath(test = "", path) {
  if (typeof test === "string") {
    return new RegExp(test.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")).test(
      path
    );
  } else if (typeof test === "function") {
    return Boolean(test(path));
  } else if (test instanceof RegExp) {
    return test.test(path);
  }
}

function log(verbose, messages = [], level = "info") {
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
