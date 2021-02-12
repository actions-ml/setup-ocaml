import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as github from "@actions/github";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import * as process from "process";
import * as semver from "semver";

import {
  GITHUB_TOKEN,
  OPAM_DISABLE_SANDBOXING,
  OPAM_REPOSITORY,
} from "./constants";
import {
  checkIfCacheFileExists,
  makeHttpClient,
  retrieveCache,
} from "./internal/cacheHttpClient";
import { composeImageName } from "./internal/imageName";
import {
  getArchitecture,
  getPlatform,
  getSystemIdentificationData,
  IS_WINDOWS,
} from "./internal/system";

const octokit = github.getOctokit(GITHUB_TOKEN);

async function getLatestOpamRelease() {
  const {
    data: { assets, tag_name: version },
  } = await octokit.repos.getLatestRelease({
    owner: "ocaml",
    repo: "opam",
  });
  const [{ browser_download_url: browserDownloadUrl }] = assets.filter(
    ({ browser_download_url }) => {
      const architecture = getArchitecture();
      const platform = getPlatform();
      return browser_download_url.includes(`${architecture}-${platform}`);
    }
  );
  return { version, browserDownloadUrl };
}

async function acquireOpamUnix() {
  const { version, browserDownloadUrl } = await getLatestOpamRelease();
  const architecture = getArchitecture();
  const cachedPath = tc.find("opam", version, architecture);
  if (cachedPath === "") {
    const downloadedPath = await tc.downloadTool(browserDownloadUrl);
    core.info(`Acquired ${version} from ${browserDownloadUrl}`);
    const cachedPath = await tc.cacheFile(
      downloadedPath,
      "opam",
      "opam",
      version,
      architecture
    );
    core.info(`Successfully cached opam to ${cachedPath}`);
    await fs.chmod(`${cachedPath}/opam`, 0o755);
    core.addPath(cachedPath);
    core.info("Added opam to the path");
  } else {
    core.addPath(cachedPath);
    core.info("Added cached opam to the path");
  }
}

async function initializeOpamUnix(version: string) {
  const platform = getPlatform();
  const isGitHubRunner = process.env.ImageOS !== undefined;
  if (isGitHubRunner) {
    if (platform === "linux") {
      const { version: systemVersion } = await getSystemIdentificationData();
      if (systemVersion === "16.04" || systemVersion === "18.04") {
        // [info]: musl-tools bug in ubuntu 18.04;
        // <https://github.com/ocaml/ocaml/issues/9131#issuecomment-599765888>
        await exec("sudo", ["add-apt-repository", "ppa:avsm/musl", "--yes"]);
      }
      const bubblewrap = [];
      // [info]: <https://github.com/ocaml/opam/issues/3424>
      if (systemVersion !== "16.04") {
        bubblewrap.push("bubblewrap");
      }
      await exec("sudo", [
        "apt-get",
        "install",
        "darcs",
        "musl-tools",
        ...bubblewrap,
        "--yes",
      ]);
    } else if (platform === "macos") {
      await exec("brew", ["install", "darcs", "mercurial"]);
    }
  }
  const disableSandboxing = [];
  if (OPAM_DISABLE_SANDBOXING.toLocaleLowerCase() === "true") {
    disableSandboxing.push("--disable-sandboxing");
  }
  const repository =
    OPAM_REPOSITORY || "https://github.com/ocaml/opam-repository.git";
  const baseUrl = "https://cache.actions-ml.org";
  const imageName = await composeImageName();
  const url = `${baseUrl}/${version}/${imageName}/${version}.tar.gz`;
  const isCacheFileExist = await checkIfCacheFileExists(url);
  const isVariant = version.includes("+");
  const variantVersion = version.split("+")[0];
  let isCacheExist = !IS_WINDOWS && isGitHubRunner && isCacheFileExist;
  if (isCacheExist) {
    try {
      await retrieveCache(url, version);
    } catch (error) {
      isCacheExist = false;
      core.error(error.message);
    }
  }
  let shouldRetry = false;
  try {
    await exec("opam", [
      "init",
      "default",
      repository,
      "--compiler",
      isCacheExist
        ? isVariant
          ? `ocaml-system.${variantVersion}`
          : `ocaml-system.${version}`
        : isVariant
        ? `ocaml-variants.${version}`
        : `ocaml-base-compiler.${version}`,
      "--auto-setup",
      ...disableSandboxing,
      "--yes",
    ]);
  } catch (error) {
    core.debug(error.message);
    shouldRetry = true;
  }
  if (shouldRetry) {
    const homeDir = os.homedir();
    const opamRoot = path.join(homeDir, ".opam");
    await io.rmRF(opamRoot);
    await exec("opam", [
      "init",
      "default",
      repository,
      "--compiler",
      isVariant
        ? `ocaml-variants.${version}`
        : `ocaml-base-compiler.${version}`,
      "--auto-setup",
      ...disableSandboxing,
      "--yes",
    ]);
  }
}

async function setupOpamUnix(version: string) {
  core.startGroup("Install opam");
  await acquireOpamUnix();
  core.endGroup();
  core.startGroup("Initialise the opam state");
  await initializeOpamUnix(version);
  core.endGroup();
}

async function getCygwinVersion() {
  const httpClient = makeHttpClient();
  const response = await httpClient.get("https://www.cygwin.com");
  const body = await response.readBody();
  const $ = cheerio.load(body);
  let version = "";
  $("a").each((_index, element) => {
    const text = $(element).text();
    if (semver.valid(text) === text) {
      version = text;
    }
  });
  return version;
}

async function setupCygwin() {
  const version = await getCygwinVersion();
  const cachedPath = tc.find("cygwin", version, "x86_64");
  if (cachedPath === "") {
    const downloadedPath = await tc.downloadTool(
      "https://cygwin.com/setup-x86_64.exe"
    );
    const cachedPath = await tc.cacheFile(
      downloadedPath,
      "setup-x86_64.exe",
      "cygwin",
      version,
      "x86_64"
    );
    core.addPath(cachedPath);
  } else {
    core.addPath(cachedPath);
  }
  const root = "c:\\cygwin";
  const site = "https://mirrors.kernel.org/sourceware/cygwin";
  const packages = [
    "curl",
    "diff",
    "diffutils",
    "git",
    "m4",
    "make",
    "mingw64-x86_64-gcc-core",
    "mingw64-x86_64-gcc-g++",
    "patch",
    "perl",
    "rsync",
    "unzip",
  ].join(",");
  await exec("setup-x86_64.exe", [
    "--quiet-mode",
    "--root",
    root,
    "--site",
    site,
    "--packages",
    packages,
  ]);
  const setupExePath = await io.which("setup-x86_64.exe");
  await io.cp(setupExePath, root);
  core.addPath(`${root}\\bin`);
}

async function acquireOpamWindows() {
  async function install(path: string) {
    const installSh = `${path}\\opam64\\install.sh`;
    await fs.chmod(installSh, 0o755);
    await exec("bash", [installSh, "--prefix", "/usr"]);
  }
  const version = "0.0.0.2";
  const cachedPath = tc.find("opam", version);
  if (cachedPath === "") {
    const downloadedPath = await tc.downloadTool(
      `https://github.com/fdopen/opam-repository-mingw/releases/download/${version}/opam64.tar.xz`
    );
    const extractedPath = await tc.extractTar(downloadedPath, undefined, [
      "xv",
    ]);
    const cachedPath = await tc.cacheDir(extractedPath, "opam", version);
    await install(cachedPath);
  } else {
    await install(cachedPath);
  }
}

async function initializeOpamWindows(version: string) {
  const isVariant = version.includes("+");
  const repository =
    OPAM_REPOSITORY ||
    "https://github.com/fdopen/opam-repository-mingw.git#opam2";
  const disableSandboxing = [];
  if (
    OPAM_DISABLE_SANDBOXING === "" ||
    OPAM_DISABLE_SANDBOXING.toLocaleLowerCase() === "true"
  ) {
    disableSandboxing.push("--disable-sandboxing");
  }
  await exec("opam", [
    "init",
    "default",
    repository,
    "--compiler",
    isVariant
      ? `ocaml-variants.${version}`
      : `ocaml-variants.${version}+mingw64c`,
    "--auto-setup",
    ...disableSandboxing,
    "--yes",
  ]);
  const wrapperbin = `c:\\cygwin\\wrapperbin`;
  await io.mkdirP(wrapperbin);
  const opamBat = `${wrapperbin}\\opam.bat`;

  await fs.writeFile(opamBat, "@echo off\r\nocaml-env exec -- opam.exe %*", {
    mode: 0o755,
  });
  core.addPath(wrapperbin);
}

async function setupOpamWindows(version: string) {
  core.startGroup("Prepare Cygwin environment");
  await setupCygwin();
  core.endGroup();
  core.startGroup("Install opam");
  await acquireOpamWindows();
  core.endGroup();
  core.startGroup("Initialise the opam state");
  await initializeOpamWindows(version);
  core.endGroup();
}

export async function setupOpam(version: string): Promise<void> {
  if (IS_WINDOWS) {
    await setupOpamWindows(version);
  } else {
    await setupOpamUnix(version);
  }
}

export async function pin(fpaths: string[]): Promise<void> {
  core.startGroup("Pin local packages");
  for (const fpath of fpaths) {
    const fname = path.basename(fpath, ".opam");
    const dname = path.dirname(fpath);
    await exec(
      "opam",
      ["pin", "add", `${fname}.dev`, ".", "--no-action", "--yes"],
      { cwd: dname }
    );
  }
  core.endGroup();
}
