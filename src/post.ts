import * as core from "@actions/core";

import { saveCache } from "./cache";
import { DUNE_CACHE, OPAM_DUNE_LINT } from "./constants";
import { trimDuneCache } from "./dune";
import { duneLint, installDuneLint } from "./duneLint";

async function run() {
  try {
    if (OPAM_DUNE_LINT.toLowerCase() === "post") {
      await installDuneLint();
      await duneLint();
    }
    if (DUNE_CACHE.toLowerCase() === "true") {
      await trimDuneCache();
    }
    await saveCache();
  } catch (error) {
    core.info(error.message);
  }
}

run();
