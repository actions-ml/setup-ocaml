import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as os from "os";
import * as process from "process";

import { DUNE_CACHE, OCAML_VERSION, OPAM_DEPEXT, OPAM_PIN } from "./constants";
import { installDepext, installSystemPackages } from "./depext";
import { installDune, startDuneCacheDaemon } from "./dune";
import { listAllOpamFileNames } from "./internal/listAllOpamFileNames";
import { resolveVersion } from "./internal/resolveVersion";
import { getPlatform } from "./internal/system";
import { pin, setupOpam } from "./opam";

export async function installer(): Promise<void> {
  const numberOfProcessors = os.cpus().length;
  core.exportVariable("OPAMJOBS", numberOfProcessors);
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
  await installDepext();
  if (DUNE_CACHE.toLowerCase() === "true") {
    await installDune();
    await startDuneCacheDaemon();
  }
  const fnames = await listAllOpamFileNames();
  if (fnames.length > 0) {
    if (OPAM_PIN.toLowerCase() === "true") {
      await pin(fnames);
    }
    if (OPAM_DEPEXT.toLowerCase() === "true") {
      await installSystemPackages(fnames);
    }
  }
  await exec("opam", ["--version"]);
  await exec("opam", ["depext", "--version"]);
  await exec("opam", ["exec", "--", "ocaml", "-version"]);
}
