import * as core from "@actions/core";
import { exec } from "@actions/exec";

export async function installDepext(): Promise<void> {
  core.startGroup("Install depext");
  await exec("opam", ["install", "depext"]);
  core.endGroup();
}

export async function installSystemPackages(fnames: string[]): Promise<void> {
  core.startGroup("Install system packages required by opam packages");
  await exec("opam", [
    "depext",
    ...fnames,
    "--yes",
    "--with-doc",
    "--with-test",
  ]);
  core.endGroup();
}
