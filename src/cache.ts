import * as cache from "@actions/cache";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as os from "os";
import * as path from "path";
import * as process from "process";

import { DUNE_CACHE, OCAML_VERSION } from "./constants";
import { getArchitecture, getPlatform, IS_WINDOWS } from "./internal/system";

const { workflow: _workflow, job, runId, runNumber } = github.context;

const workflow = _workflow.toLowerCase().replace(/\s+/g, "_");

async function composeKeys() {
  const platform = await getPlatform();
  const architecture = await getArchitecture();
  const key = `${platform}-${architecture}-${OCAML_VERSION}-${workflow}-${job}-${runId}-${runNumber}`;
  const restoreKeys = [
    `${platform}-${architecture}-${OCAML_VERSION}-${job}-${workflow}-${runId}-`,
    `${platform}-${architecture}-${OCAML_VERSION}-${job}-${workflow}-`,
    `${platform}-${architecture}-${OCAML_VERSION}-${job}-`,
    `${platform}-${architecture}-${OCAML_VERSION}-`,
  ];
  return { key, restoreKeys };
}

async function composePaths() {
  const homeDir = os.homedir();
  const opamDownloadCacheDir = path.join(homeDir, ".opam", "download-cache");
  const opamRepoDir = path.join(homeDir, ".opam", "repo");
  const xdgCacheHome = process.env.XDG_CACHE_HOME;
  const paths = [opamDownloadCacheDir, opamRepoDir];
  if (DUNE_CACHE) {
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
