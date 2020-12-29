import { exec } from "@actions/exec";
import * as io from "@actions/io";
import * as os from "os";

export const IS_WINDOWS = process.platform === "win32";

export function getArchitecture(): "x86_64" {
  switch (os.arch()) {
    case "x64":
      return "x86_64";
    default:
      throw new Error("The architecture is not supported.");
  }
}

export function getPlatform(): "linux" | "windows" | "macos" {
  switch (os.platform()) {
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    default:
      throw new Error("The platform is not supported.");
  }
}

export async function opamExec(args: string[]): Promise<void> {
  const opam = await io.which("opam", true);
  const PATH = process.env.PATH || "";
  const options = { env: { ...process.env, PATH } };
  if (IS_WINDOWS) {
    const opamEnv = await io.which("ocaml-env", true);
    await exec(opamEnv, ["exec", "--", opam, ...args], options);
  } else {
    await exec(opam, ["exec", "--", opam, ...args], options);
  }
}
