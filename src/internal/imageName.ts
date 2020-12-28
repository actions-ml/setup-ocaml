import type { ExecOptions } from "@actions/exec";
import { exec } from "@actions/exec";
import { promises as fs } from "fs";

import { getPlatform } from "./system";

export async function makeImageName(): Promise<string> {
  if (getPlatform() === "linux") {
    const osRelease = (await fs.readFile("/etc/os-release")).toString();
    const lines = osRelease.split("\n");
    let distro = "";
    let version = "";
    for (const line of lines) {
      const props = line.split("=");
      if (props[0] === "ID") {
        distro = props[1].trim().toLowerCase();
      } else if (props[0] === "VERSION_ID") {
        version = props[1].trim().toLowerCase().replace(/["]/g, "");
      }
    }
    return `${distro}-${version}`;
  } else if (getPlatform() === "macos") {
    let output = "";
    const options: ExecOptions = {};
    options.listeners = {
      stdout: (data) => {
        output += data.toString();
      },
    };
    await exec("sw_vers", undefined, options);
    const lines = output.split("\n");
    let version = "";
    for (const line of lines) {
      const props = line.split(":");
      if (props[0] === "ProductVersion") {
        const _version = props[1].trim().split(".");
        version = `${_version[0]}.${_version[1]}`;
      }
    }
    return `macos-${version}`;
  } else {
    throw new Error("The image type is not supported.");
  }
}
