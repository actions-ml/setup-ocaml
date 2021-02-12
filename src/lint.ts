import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as glob from "@actions/glob";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import * as process from "process";

import { getOpamLocalPackages } from "./packages";

export async function installOdoc(): Promise<void> {
  core.startGroup("Install odoc");
  // [info] Warnings-as-errors was introduced in odoc>=1.5.0
  // [info] conf-m4 is a work-around for
  // https://github.com/ocaml-opam/opam-depext/pull/132
  await exec("opam", [
    "depext",
    "conf-m4",
    "dune",
    "odoc>=1.5.0",
    "--install",
    "--yes",
  ]);
  core.endGroup();
}

export async function installOcamlformat(): Promise<void> {
  core.startGroup("Install ocamlformat");
  const globber = await glob.create("**/ocamlformat.opam");
  const ocamlformatOpamFile = await globber.glob();
  const isVendored = ocamlformatOpamFile.length > 0;
  if (isVendored) {
    await exec("opam", [
      "pin",
      "add",
      "--kind",
      "path",
      "ocamlformat",
      ocamlformatOpamFile[0],
      "--no-action",
    ]);
    await exec("opam", ["depext", "ocamlformat", "--install", "--yes"]);
  } else {
    const globber = await glob.create("**/.ocamlformat");
    const [_ocamlformatFile] = await globber.glob();
    const ocamlformatFile = (await fs.readFile(_ocamlformatFile)).toString();
    const lines = ocamlformatFile.split(os.EOL);
    let version = "";
    for (const line of lines) {
      const kv = line.split("=");
      if (kv[0].trim() === "version") {
        version = kv[1].trim();
      }
    }
    const hasVersionField = version.length > 0;
    await exec("opam", [
      "depext",
      "dune",
      hasVersionField ? `ocamlformat=${version}` : "ocamlformat",
      "--install",
      "--yes",
    ]);
  }
  core.endGroup();
}

export async function installDuneLint(): Promise<void> {
  core.startGroup("Install dune-lint");
  await exec("opam", ["depext", "opam-dune-lint", "--install", "--yes"]);
  core.endGroup();
}

export async function lintDoc(): Promise<void> {
  core.startGroup("Check if documentation builds without errors");
  await exec("opam", ["exec", "--", "dune", "build", "@doc"], {
    env: {
      ...process.env,
      ODOC_WARN_ERROR: "true",
    },
  });
  core.endGroup();
}

export async function lintFmt(): Promise<void> {
  core.startGroup("Check if the codebase is formatted");
  await exec("opam", ["exec", "--", "dune", "build", "@fmt"]);
  core.endGroup();
}

function unique(array: string[]) {
  return Array.from(new Set(array));
}

export async function lintOpam(): Promise<void> {
  core.startGroup(
    "Check each required opam package is listed in the opam file"
  );
  const fpaths = await getOpamLocalPackages();
  const _dnames = fpaths.map((fpath) => path.dirname(fpath));
  const dnames = unique(_dnames);
  for (const dname of dnames) {
    await exec("opam", ["exec", "--", "opam-dune-lint"], { cwd: dname });
  }
  core.endGroup();
}
