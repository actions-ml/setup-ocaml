import type { ExecOptions } from "@actions/exec";
import { exec } from "@actions/exec";
import { promises as fs } from "fs";
import * as os from "os";
import * as process from "process";

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

export async function getSystemIdentificationData(): Promise<{
  distro: string;
  version: string;
}> {
  const platform = getPlatform();
  if (platform === "linux") {
    const osRelease = (await fs.readFile("/etc/os-release")).toString();
    const lines = osRelease.split(os.EOL);
    let distro = "";
    let version = "";
    for (const line of lines) {
      const kv = line.split("=");
      if (kv[0] === "ID") {
        distro = kv[1].trim().toLowerCase();
      } else if (kv[0] === "VERSION_ID") {
        version = kv[1].trim().toLowerCase().replace(/["]/g, "");
      }
    }
    return { distro, version };
  } else if (platform === "macos") {
    let output = "";
    const options: ExecOptions = { silent: true };
    options.listeners = {
      stdout: (data) => {
        output += data.toString();
      },
    };
    await exec("sw_vers", undefined, options);
    const lines = output.split(os.EOL);
    let version = "";
    for (const line of lines) {
      const kv = line.split(":");
      if (kv[0] === "ProductVersion") {
        version = kv[1].trim();
      }
    }
    return { distro: "macos", version };
  } else {
    throw new Error("The system is not supported.");
  }
}
