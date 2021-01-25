import { getPlatform, getSystemIdentificationData } from "./system";

export async function composeImageName(): Promise<string> {
  const { distro, version } = await getSystemIdentificationData();
  const platform = getPlatform();
  if (platform === "linux") {
    return `${distro}-${version}`;
  } else if (platform === "macos") {
    const versionArr = version.split(".");
    return `macos-${versionArr[0]}.${versionArr[1]}`;
  } else {
    throw new Error("The image type is not supported.");
  }
}
