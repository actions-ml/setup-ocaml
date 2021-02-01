import * as core from "@actions/core";
import { exec } from "@actions/exec";

export async function installDune(): Promise<void> {
  core.startGroup("Install dune");
  await exec("opam", ["install", "dune", "--verbose", "--yes"]);
  core.endGroup();
}

export async function trimDuneCache(): Promise<void> {
  core.startGroup("Remove oldest files from the dune cache to free space");
  await exec("opam", [
    "exec",
    "--",
    "dune",
    "cache",
    "trim",
    "--size",
    "100MB",
  ]);
  core.endGroup();
}
