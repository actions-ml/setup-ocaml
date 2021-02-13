import * as core from "@actions/core";

export const GITHUB_TOKEN = core.getInput("github-token");

export const DUNE_CACHE = core.getInput("dune-cache").toUpperCase() === "TRUE";

export const OCAML_VERSION = core.getInput("ocaml-version");

export const OPAM_DEPEXT =
  core.getInput("opam-depext").toUpperCase() === "TRUE";

export const OPAM_DISABLE_SANDBOXING =
  core.getInput("opam-disable-sandboxing").toUpperCase() === "TRUE";

export const OPAM_LINT = core.getInput("opam-lint").toUpperCase() === "TRUE";

export const OPAM_LOCAL_PACKAGES = core.getInput("opam-local-packages");

export const OPAM_PIN = core.getInput("opam-pin").toUpperCase() === "TRUE";

export const OPAM_REPOSITORY = core.getInput("opam-repository");
