import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as path from "path";

import { IS_WINDOWS } from "./internal/system";

export async function installDepext(): Promise<void> {
  core.startGroup("Install depext");
  const depextCygwinports = IS_WINDOWS ? ["depext-cygwinports"] : [];
  await exec("opam", ["install", "depext", ...depextCygwinports, "--yes"]);
  core.endGroup();
}

export async function installSystemPackages(fpaths: string[]): Promise<void> {
  core.startGroup("Install system packages required by opam packages");
  const fnames = fpaths.map((fpath) => path.basename(fpath, ".opam"));
  await exec("opam", ["depext", ...fnames, "--yes"]);
  core.endGroup();
}
