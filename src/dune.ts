import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as io from "@actions/io";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";

import { IS_WINDOWS } from "./internal/system";

export async function installDune(): Promise<void> {
  core.startGroup("Install dune");
  await exec("opam", ["install", "dune", "--verbose", "--yes"]);
  core.endGroup();
}

async function createDuneGlobalConfigFile(): Promise<void> {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  const homeDir = os.homedir();
  const configDir = IS_WINDOWS
    ? path.join(homeDir, "Local Settings")
    : xdgConfigHome
    ? path.join(xdgConfigHome)
    : path.join(homeDir, ".config");
  const duneConfigDir = path.join(configDir, "dune");
  await io.mkdirP(duneConfigDir);
  const configFilePath = path.join(duneConfigDir, "config");
  const config = [
    "(lang dune 2.1)",
    "(cache enabled)",
    "(cache-duplication copy)",
  ];
  const contents = IS_WINDOWS ? config.join("\r\n") : config.join("\n");
  await fs.writeFile(configFilePath, contents, {
    mode: 0o666,
  });
}

export async function startDuneCacheDaemon(): Promise<void> {
  core.startGroup("Start the dune cache daemon");
  await createDuneGlobalConfigFile();
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
