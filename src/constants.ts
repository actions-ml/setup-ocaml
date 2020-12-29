import * as core from "@actions/core";

export const GITHUB_TOKEN = core.getInput("github-token");

export const OCAML_VERSION = core.getInput("ocaml-version");
