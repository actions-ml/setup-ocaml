import * as core from "@actions/core";
import { exec } from "@actions/exec";

export async function installDune(): Promise<void> {
  core.startGroup("Install dune");
  await exec("opam", ["install", "dune", "--verbose", "--yes"]);
  core.endGroup();
}

export async function startDuneCacheDaemon(): Promise<void> {
  core.startGroup("Start dune cache daemon");
  await exec("opam", ["exec", "--", "dune", "cache", "start"]);
  core.endGroup();
}
