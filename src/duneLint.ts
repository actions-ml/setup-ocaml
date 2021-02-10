import * as core from "@actions/core";
import { exec } from "@actions/exec";

export async function installDuneLint(): Promise<void> {
  core.startGroup("Install dune-lint");
  await exec("opam", [
    "depext",
    "opam-dune-lint",
    "--install",
    "--verbose",
    "--yes",
  ]);
  core.endGroup();
}

export async function duneLint(): Promise<void> {
  core.startGroup(
    "Check each required opam package is listed in the opam file"
  );
  await exec("opam", ["exec", "--", "opam-dune-lint"]);
  core.endGroup();
}
