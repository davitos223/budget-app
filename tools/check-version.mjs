import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const html = read("../docs/index.html");
const cloud = read("../docs/cloud.js");
const version = html.match(/\bconst APP_VERSION = "([^"]+)";/)?.[1];
assert.ok(version, "Missing APP_VERSION in index.html");
for (const file of ["config.js", "cloud.js", "calculations.js"]) {
  assert.ok(html.includes(`src="${file}?v=${version}"`), `The ${file} script URL must use APP_VERSION (${version})`);
}
assert.equal(cloud.match(/\bversion: "([^"]+)"/)?.[1], version, "cloud.js version must match APP_VERSION");
console.log(`App version and script URLs agree (${version}).`);
