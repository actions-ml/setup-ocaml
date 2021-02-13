import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as glob from "@actions/glob";
import * as _fs from "fs";
import * as os from "os";
import * as path from "path";
import * as process from "process";

const { promises: fs } = _fs;

export async function installOdoc(): Promise<void> {
  core.startGroup("Install odoc");
  // [info] Warnings-as-errors was introduced in odoc>=1.5.0
  // [info] conf-m4 is a work-around for
  // https://github.com/ocaml-opam/opam-depext/pull/132
  await exec("opam", [
    "depext",
    "conf-m4",
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
    let version = "";
    const config = path.join(process.cwd(), ".ocamlformat");
    const isConfigExists = await fs
      .access(config, _fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);
    if (isConfigExists) {
      const ocamlformatFile = (await fs.readFile(config)).toString();
      const lines = ocamlformatFile.split(os.EOL);
      for (const line of lines) {
        const kv = line.split("=");
        if (kv[0].trim() === "version") {
          version = kv[1].trim();
        }
      }
    }
    await exec("opam", [
      "depext",
      version ? `ocamlformat=${version}` : "ocamlformat",
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
