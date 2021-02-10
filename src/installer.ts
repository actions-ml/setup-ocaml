import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as os from "os";
import * as process from "process";

import { restoreCache } from "./cache";
import {
  DUNE_CACHE,
  OCAML_VERSION,
  OPAM_DEPEXT,
  OPAM_DUNE_LINT,
  OPAM_PIN,
} from "./constants";
import { installDepext, installSystemPackages } from "./depext";
import { installDune } from "./dune";
import { installDuneLint } from "./duneLint";
import { resolveVersion } from "./internal/resolveVersion";
import { getPlatform } from "./internal/system";
import { pin, setupOpam } from "./opam";
import { getOpamLocalPackages } from "./packages";

export async function installer(): Promise<void> {
  const numberOfProcessors = os.cpus().length;
  core.exportVariable("OPAMJOBS", numberOfProcessors + 2);
  core.exportVariable("OPAMDOWNLOADJOBS", 1);
  core.exportVariable("OPAMERRLOGLEN", 0);
  core.exportVariable("OPAMPRECISETRACKING", 1);
  core.exportVariable("OPAMSOLVERTIMEOUT", 500);
  core.exportVariable("OPAMYES", 1);
  const platform = getPlatform();
  if (platform === "windows") {
    core.exportVariable("CYGWIN", "winsymlinks:native");
    core.exportVariable("HOME", process.env.USERPROFILE);
  } else if (platform === "macos") {
    core.exportVariable("HOMEBREW_NO_AUTO_UPDATE", 1);
    core.exportVariable("HOMEBREW_NO_INSTALL_CLEANUP", 1);
  }
  const version = await resolveVersion(OCAML_VERSION);
  await setupOpam(version);
  await restoreCache();
  await installDepext();
  if (DUNE_CACHE.toUpperCase() === "TRUE") {
    await installDune();
    core.exportVariable("DUNE_CACHE", "enabled");
    core.exportVariable("DUNE_CACHE_TRANSPORT", "direct");
  }
  if (OPAM_DUNE_LINT.toUpperCase() === "TRUE") {
    await installDuneLint();
  }
  const fnames = await getOpamLocalPackages();
  if (fnames.length > 0) {
    if (OPAM_PIN.toUpperCase() === "TRUE") {
      await pin(fnames);
    }
    if (OPAM_DEPEXT.toUpperCase() === "TRUE") {
      await installSystemPackages(fnames);
    }
  }
  await exec("opam", ["--version"]);
  await exec("opam", ["depext", "--version"]);
  await exec("opam", ["exec", "--", "ocaml", "-version"]);
}
