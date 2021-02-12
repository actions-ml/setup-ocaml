import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as path from "path";

export async function installDepext(): Promise<void> {
  core.startGroup("Install depext");
  await exec("opam", ["install", "depext", "--yes"]);
  core.endGroup();
}

export async function installSystemPackages(fpaths: string[]): Promise<void> {
  core.startGroup("Install system packages required by opam packages");
  const fnames = fpaths.map((fpath) => path.basename(fpath, ".opam"));
  await exec("opam", ["depext", ...fnames, "--yes"]);
  core.endGroup();
}
