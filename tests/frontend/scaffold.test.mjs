import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

test("uses the current Decky package boundaries and real verification scripts", async () => {
  const packageJson = await readJson("package.json");

  assert.equal(packageJson.dependencies["@decky/api"], "^1.1.3");
  assert.equal(packageJson.devDependencies["@decky/ui"], "^4.11.0");
  assert.equal(packageJson.devDependencies["@decky/rollup"], "^1.0.2");

  for (const script of [
    "build",
    "typecheck",
    "frontend-test",
    "backend-test",
    "test",
    "verify",
  ]) {
    assert.equal(typeof packageJson.scripts[script], "string");
    assert.doesNotMatch(packageJson.scripts[script], /no test specified/i);
  }
});

test("does not request Decky root privileges", async () => {
  const manifest = await readJson("plugin.json");

  assert.equal(manifest.api_version, 1);
  assert.deepEqual(manifest.flags, []);
  assert.equal(manifest.flags.includes("_root"), false);
});
