import * as core from "@actions/core";

import { saveCache } from "./cache";
import { DUNE_CACHE } from "./constants";
import { stopDuneCacheDaemon, trimDuneCacheDaemon } from "./dune";

async function run() {
  try {
    if (DUNE_CACHE.toLowerCase() === "true") {
      await stopDuneCacheDaemon();
      await trimDuneCacheDaemon();
    }
    await saveCache();
  } catch (error) {
    core.info(error.message);
  }
}

run();
