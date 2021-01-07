import { getPlatform, getSystemIdentificationData } from "./system";

export async function makeImageName(): Promise<string> {
  const { distro, version } = await getSystemIdentificationData();
  if (getPlatform() === "linux") {
    return `${distro}-${version}`;
  } else if (getPlatform() === "macos") {
    const versionArr = version.split(".");
    return `macos-${versionArr[0]}.${versionArr[1]}`;
  } else {
    throw new Error("The image type is not supported.");
  }
}
