import * as glob from "@actions/glob";
import * as path from "path";

import { OPAM_LOCAL_PACKAGES } from "./constants";

export async function getOpamLocalPackages(): Promise<string[]> {
  const globber = await glob.create(OPAM_LOCAL_PACKAGES);
  const opamFiles = await globber.glob();
  const fnames = opamFiles.map((opamFile) => path.basename(opamFile, ".opam"));
  return fnames;
}
