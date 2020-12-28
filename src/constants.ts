import * as core from "@actions/core";

export const BASE_URL = "https://cache.actions-ml.org";

export const GITHUB_TOKEN = core.getInput("github-token");

export const OCAML_VERSION = core.getInput("ocaml-version");

export const IS_WINDOWS = process.platform === "win32";
