import * as core from "@actions/core";

import { saveCache } from "./cache";

async function run() {
  try {
    await saveCache();
  } catch (error) {
    core.info(error.message);
  }
}

run();
