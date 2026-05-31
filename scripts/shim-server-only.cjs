/** tsx prebuild — Next.js "server-only" paketini no-op yapar */
const Module = require("node:module");
const path = require("node:path");

const noopPath = path.join(__dirname, "server-only-noop.cjs");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function shimResolveFilename(request, parent, isMain, options) {
  if (request === "server-only") {
    return noopPath;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
