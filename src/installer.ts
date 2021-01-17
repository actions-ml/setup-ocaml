import { exec } from "@actions/exec";

import { OCAML_VERSION, OPAM_DEPEXT, OPAM_PIN } from "./constants";
import { installDepext, installSystemPackages } from "./depext";
import { listAllOpamFileNames } from "./internal/listAllOpamFileNames";
import { resolveVersion } from "./internal/resolveVersion";
import { pin, setupOpam } from "./opam";

export async function installer(): Promise<void> {
  const version = await resolveVersion(OCAML_VERSION);
  await setupOpam(version);
  await installDepext();
  const fnames = await listAllOpamFileNames();
  if (fnames.length > 0) {
    if (OPAM_PIN.toLocaleLowerCase() === "true") {
      await pin(fnames);
    }
    if (OPAM_DEPEXT.toLocaleLowerCase() === "true") {
      await installSystemPackages(fnames);
    }
  }
  await exec("opam", ["--version"]);
  await exec("opam", ["depext", "--version"]);
  await exec("opam", ["exec", "--", "ocaml", "-version"]);
}
