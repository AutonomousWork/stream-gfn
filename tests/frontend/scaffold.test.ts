import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const readJson = async (path: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;

describe("Decky scaffold", () => {
  it("uses current Decky package boundaries and real verification scripts", async () => {
    const packageJson = await readJson("package.json");
    const dependencies = packageJson.dependencies as Record<string, string>;
    const devDependencies = packageJson.devDependencies as Record<string, string>;
    const scripts = packageJson.scripts as Record<string, string>;

    expect(dependencies["@decky/api"]).toBe("^1.1.3");
    expect(devDependencies["@decky/ui"]).toBe("^4.11.0");
    expect(devDependencies["@decky/rollup"]).toBe("^1.0.2");

    for (const script of [
      "build",
      "typecheck",
      "frontend-test",
      "backend-test",
      "test",
      "verify",
    ]) {
      expect(scripts[script]).toEqual(expect.any(String));
      expect(scripts[script]).not.toMatch(/no test specified/i);
    }
  });

  it("does not request Decky root privileges", async () => {
    const manifest = await readJson("plugin.json");

    expect(manifest.api_version).toBe(1);
    expect(manifest.flags).toEqual([]);
  });
});
