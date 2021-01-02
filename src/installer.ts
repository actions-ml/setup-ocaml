import { exec } from "@actions/exec";

import { OCAML_VERSION } from "./constants";
import { installDepext, installSystemPackages } from "./depext";
import { listAllOpamFileNames } from "./internal/listAllOpamFileNames";
import { resolveVersion } from "./internal/resolveVersion";
import { acquireOpam, pin } from "./opam";

export async function installer(): Promise<void> {
  const version = await resolveVersion(OCAML_VERSION);
  await acquireOpam(version);
  await installDepext();
  const fnames = await listAllOpamFileNames();
  if (fnames.length > 0) {
    await pin(fnames);
    await installSystemPackages(fnames);
  }
  await exec("opam", ["--version"]);
  await exec("opam", ["depext", "--version"]);
  await exec("opam", ["exec", "--", "ocaml", "-version"]);
}
