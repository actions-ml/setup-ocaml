import * as core from "@actions/core";
import * as process from "process";

import { saveCache } from "./cache";
import { DUNE_CACHE, OPAM_DUNE_LINT } from "./constants";
import { trimDuneCache } from "./dune";
import { duneLint } from "./duneLint";

async function run() {
  try {
    if (OPAM_DUNE_LINT.toLowerCase() === "true") {
      await duneLint();
    }
  } catch (error) {
    core.setFailed(error.message);
    process.exit(core.ExitCode.Failure);
  }
  try {
    if (DUNE_CACHE.toLowerCase() === "true") {
      await trimDuneCache();
    }
    await saveCache();
  } catch (error) {
    core.warning(error.message);
  }
}

run();
