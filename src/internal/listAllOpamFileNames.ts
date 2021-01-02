import { promises as fs } from "fs";
import * as path from "path";

async function listAllFiles() {
  const dirents = await fs.readdir(".", { withFileTypes: true });
  const fdirents = dirents.filter((dirent) => dirent.isFile());
  const fnames = fdirents.map((fdirent) => fdirent.name);
  return fnames;
}

export async function listAllOpamFileNames(): Promise<string[]> {
  const opamExt = ".opam";
  const files = await listAllFiles();
  const opamFiles = files.filter((file) => path.extname(file) === opamExt);
  const fnames = opamFiles.map((opamFile) => path.basename(opamFile, opamExt));
  return fnames;
}
