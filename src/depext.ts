import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as path from "path";

import { OPAM_DEPEXT_FLAGS } from "./constants";
import { getPlatform, IS_WINDOWS } from "./internal/system";

export async function installDepext(ocamlVersion: string): Promise<void> {
  core.startGroup("Install depext");
  const depextCygwinports = IS_WINDOWS ? ["depext-cygwinports"] : [];
  await exec("opam", ["install", "depext", ...depextCygwinports, "--yes"]);
  const platform = getPlatform();
  if (platform === "windows") {
    let base = "";
    if (ocamlVersion.includes("mingw64")) {
      base = "x86_64-w64-mingw32";
    } else if (ocamlVersion.includes("mingw32")) {
      base = "i686-w64-mingw32";
    }
    core.addPath(path.posix.join("/", "usr", base, "sys-root", "mingw", "bin"));
  }
  core.endGroup();
}

export async function installSystemPackages(fpaths: string[]): Promise<void> {
  core.startGroup("Install system packages required by opam packages");
  const fnames = fpaths.map((fpath) => path.basename(fpath, ".opam"));
  await exec("opam", ["depext", ...fnames, "--yes", ...OPAM_DEPEXT_FLAGS]);
  core.endGroup();
}
