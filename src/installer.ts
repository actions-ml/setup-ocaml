import { exec } from "@actions/exec";

import { OCAML_VERSION } from "./constants";
import { resolveVersion } from "./internal/resolveVersion";
import { acquireOpam, installDepext } from "./opam";

export async function installer(): Promise<void> {
  const version = await resolveVersion(OCAML_VERSION);
  await acquireOpam(version);
  await installDepext();
  await exec("opam", ["--version"]);
  await exec("opam", ["depext", "--version"]);
  await exec("opam", ["exec", "--", "ocaml", "-version"]);
}
