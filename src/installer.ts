import { exec } from "@actions/exec";

import { acquireOpam, installDepext } from "./opam";

export async function installer(): Promise<void> {
  await acquireOpam();
  await installDepext();
  await exec("opam", ["--version"]);
  await exec("opam", ["depext", "--version"]);
  await exec("opam", ["exec", "--", "ocaml", "--version"]);
}
