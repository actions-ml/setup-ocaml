import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as path from "path";

import { getOpamLocalPackages } from "./packages";

export async function installDuneLint(): Promise<void> {
  core.startGroup("Install dune-lint");
  await exec("opam", [
    "depext",
    "opam-dune-lint",
    "--install",
    "--verbose",
    "--yes",
  ]);
  core.endGroup();
}

function unique(array: string[]) {
  return Array.from(new Set(array));
}

async function getOpamDirs() {
  const fpaths = await getOpamLocalPackages();
  const _dnames = fpaths.map((fpath) => path.dirname(fpath));
  const dnames = unique(_dnames);
  return dnames;
}

export async function duneLint(): Promise<void> {
  core.startGroup(
    "Check each required opam package is listed in the opam file"
  );
  const dnames = await getOpamDirs();
  for (const dname of dnames) {
    await exec("opam", ["exec", "--", "opam-dune-lint"], { cwd: dname });
  }
  core.endGroup();
}
