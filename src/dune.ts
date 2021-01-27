import * as core from "@actions/core";
import { exec } from "@actions/exec";

export async function installDune(): Promise<void> {
  core.startGroup("Install dune");
  await exec("opam", ["install", "dune", "--verbose", "--yes"]);
  core.endGroup();
}

export async function startDuneCacheDaemon(): Promise<void> {
  core.startGroup("Start the dune cache daemon");
  await exec("opam", ["exec", "--", "dune", "cache", "start"]);
  core.endGroup();
}

export async function stopDuneCacheDaemon(): Promise<void> {
  core.startGroup("Stop the dune cache daemon");
  await exec("opam", ["exec", "--", "dune", "cache", "stop"]);
  core.endGroup();
}

export async function trimDuneCacheDaemon(): Promise<void> {
  core.startGroup("Remove oldest files from the dune cache to free space");
  await exec("opam", ["exec", "--", "dune", "cache", "trim", "--size", "50MB"]);
  core.endGroup();
}
