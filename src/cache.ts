import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as os from "os";
import * as path from "path";
import * as process from "process";

import { DUNE_CACHE, OCAML_VERSION } from "./constants";
import { getArchitecture, getPlatform, IS_WINDOWS } from "./internal/system";

const workflowName = process.env.GITHUB_WORKFLOW?.toLowerCase().replace(
  " ",
  "_"
);
const runId = process.env.GITHUB_RUN_ID;
const runNumber = process.env.GITHUB_RUN_NUMBER;

async function composeKeys() {
  const platform = await getPlatform();
  const architecture = await getArchitecture();
  const key = `${platform}-${architecture}-${OCAML_VERSION}-${workflowName}-${runId}-${runNumber}`;
  const restoreKeys = [
    `${platform}-${architecture}-${OCAML_VERSION}-${workflowName}-${runId}-`,
    `${platform}-${architecture}-${OCAML_VERSION}-${workflowName}-`,
    `${platform}-${architecture}-${OCAML_VERSION}-`,
  ];
  return { key, restoreKeys };
}

async function composePaths() {
  const homeDir = os.homedir();
  const opamDownloadCacheDir = path.join(homeDir, ".opam", "download-cache");
  const xdgCacheHome = process.env.XDG_CACHE_HOME;
  const paths = [opamDownloadCacheDir];
  if (DUNE_CACHE.toLowerCase() === "true") {
    const duneCacheDir = IS_WINDOWS
      ? path.join(homeDir, "Local Settings", "Cache", "dune")
      : xdgCacheHome
      ? path.join(xdgCacheHome, "dune")
      : path.join(homeDir, ".cache", "dune");
    paths.push(duneCacheDir);
  }
  return paths;
}

export async function restoreCache(): Promise<void> {
  core.startGroup("Restore cache files of opam and dune");
  const paths = await composePaths();
  const { key, restoreKeys } = await composeKeys();
  const cacheKey = await cache.restoreCache(paths, key, restoreKeys);
  if (cacheKey) {
    core.info(`Cache restored from key: ${cacheKey}`);
  } else {
    core.info(
      `Cache not found for input keys: ${[key, ...restoreKeys].join(", ")}`
    );
  }
  core.endGroup();
}

export async function saveCache(): Promise<void> {
  core.startGroup("Save cache files of opam and dune");
  const paths = await composePaths();
  const { key } = await composeKeys();
  await cache.saveCache(paths, key);
  core.endGroup();
}
