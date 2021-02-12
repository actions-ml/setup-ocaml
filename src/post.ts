import * as core from "@actions/core";
import * as process from "process";

import { saveCache } from "./cache";
import { DUNE_CACHE, LINT_DOC, LINT_FMT, LINT_OPAM } from "./constants";
import { trimDuneCache } from "./dune";
import { lintDoc, lintFmt, lintOpam } from "./lint";

async function run() {
  try {
    if (LINT_DOC) {
      await lintDoc();
    }
    if (LINT_FMT) {
      await lintFmt();
    }
    if (LINT_OPAM) {
      await lintOpam();
    }
  } catch (error) {
    core.setFailed(error.message);
    process.exit(core.ExitCode.Failure);
  }
  try {
    if (DUNE_CACHE) {
      await trimDuneCache();
    }
    await saveCache();
  } catch (error) {
    core.info(error.message);
  }
}

run();
