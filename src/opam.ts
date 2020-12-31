import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as github from "@actions/github";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import * as os from "os";
import * as semver from "semver";

import { GITHUB_TOKEN, OPAM_REPOSITORY } from "./constants";
import {
  checkIfCacheFileExists,
  makeHttpClient,
  retrieveCache,
} from "./internal/cacheHttpClient";
import { makeImageName } from "./internal/imageName";
import { getArchitecture, getPlatform, IS_WINDOWS } from "./internal/system";

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

async function setupOpamUnix() {
  const { version, browserDownloadUrl } = await getLatestOpamRelease();
  const architecture = getArchitecture();
  const cachedPath = tc.find("opam", version, architecture);
  if (cachedPath === "") {
    const downloadedPath = await tc.downloadTool(browserDownloadUrl);
    const cachedPath = await tc.cacheFile(
      downloadedPath,
      "opam",
      "opam",
      version,
      architecture
    );
    await fs.chmod(`${cachedPath}/opam`, 755);
    core.addPath(cachedPath);
  } else {
    core.addPath(cachedPath);
  }
}

async function initializeOpamUnix(version: string) {
  if (getPlatform() === "linux") {
    await exec("sudo", ["apt-get", "install", "--yes", "bubblewrap", "darcs"]);
  } else if (getPlatform() === "macos") {
    await exec("brew", ["install", "darcs", "mercurial"]);
  }
  const repository =
    OPAM_REPOSITORY || "https://github.com/ocaml/opam-repository.git";
  const baseUrl = "https://cache.actions-ml.org";
  const imageName = await makeImageName();
  const url = `${baseUrl}/${version}/${imageName}/${version}.tar.gz`;
  const isSelfHostedRunner = process.env.ImageOS === undefined;
  const isCacheFileExist = await checkIfCacheFileExists(url);
  let isCacheEnabled = !isSelfHostedRunner && !IS_WINDOWS && isCacheFileExist;
  if (isCacheEnabled) {
    try {
      await retrieveCache(url, version);
    } catch (error) {
      isCacheEnabled = false;
      core.error(error.message);
    }
  }
  await exec("opam", [
    "init",
    "default",
    repository,
    "--compiler",
    isCacheEnabled
      ? `ocaml-system.${version}`
      : `ocaml-base-compiler.${version}`,
    "--auto-setup",
    "--verbose",
  ]);
}

async function acquireOpamUnix(version: string) {
  core.startGroup("Install opam");
  await setupOpamUnix();
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
  core.exportVariable("CYGWIN", "winsymlinks:native");
  core.exportVariable("HOME", process.env.USERPROFILE);
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
  const site = "http://cygwin.mirror.constant.com";
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

async function setupOpamWindows() {
  async function install(path: string) {
    const installSh = `${path}\\opam64\\install.sh`;
    await fs.chmod(installSh, 755);
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
  const repository =
    OPAM_REPOSITORY ||
    "https://github.com/fdopen/opam-repository-mingw.git#opam2";
  await exec("opam", [
    "init",
    "default",
    repository,
    "--compiler",
    `ocaml-variants.${version}+mingw64c`,
    "--auto-setup",
    "--disable-sandboxing",
    "--enable-completion",
    "--enable-shell-hook",
    "--verbose",
  ]);
  const wrapperbin = `c:\\cygwin\\wrapperbin`;
  await io.mkdirP(wrapperbin);
  const opamBat = `${wrapperbin}\\opam.bat`;

  await fs.writeFile(opamBat, "@echo off\r\nocaml-env exec -- opam.exe %*", {
    mode: 0o755,
  });
  core.addPath(wrapperbin);
}

async function acquireOpamWindows(version: string) {
  core.startGroup("Prepare Cygwin environment");
  await setupCygwin();
  core.endGroup();
  core.startGroup("Install opam");
  await setupOpamWindows();
  core.endGroup();
  core.startGroup("Initialise the opam state");
  await initializeOpamWindows(version);
  core.endGroup();
}

export async function acquireOpam(version: string): Promise<void> {
  const numberOfProcessors = os.cpus().length;
  const jobs = numberOfProcessors + 2;
  core.exportVariable("OPAMJOBS", jobs);
  core.exportVariable("OPAMYES", 1);
  if (IS_WINDOWS) {
    core.exportVariable("OPAM_LINT", false);
    await acquireOpamWindows(version);
  } else {
    await acquireOpamUnix(version);
  }
}

export async function installDepext(): Promise<void> {
  core.startGroup("Install depext");
  await exec("opam", ["install", "depext"]);
  core.endGroup();
}
