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
