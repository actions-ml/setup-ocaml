import * as core from "@actions/core";

export const GITHUB_TOKEN = core.getInput("github-token");

export const DUNE_CACHE = core.getInput("dune-cache");

export const OCAML_VERSION = core.getInput("ocaml-version");

export const OPAM_DEPEXT = core.getInput("opam-depext");

export const OPAM_DISABLE_SANDBOXING = core.getInput("opam-disable-sandboxing");

export const OPAM_PIN = core.getInput("opam-pin");

export const OPAM_REPOSITORY = core.getInput("opam-repository");
