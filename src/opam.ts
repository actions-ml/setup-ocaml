import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as github from "@actions/github";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import { promises as fs } from "fs";
import got from "got";
import { JSDOM } from "jsdom";
import * as os from "os";
import * as semver from "semver";

import { GITHUB_TOKEN, IS_WINDOWS, OCAML_VERSION } from "./constants";
import { setupCache } from "./internal/cacheHttpClient";
import { getArchitecture, getPlatform, opamExec } from "./internal/system";

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

async function initializeOpamUnix() {
  if (getPlatform() === "linux") {
    await exec("sudo", ["apt-get", "--yes", "install", "bubblewrap"]);
  }

  try {
    if (process.env.ImageOS !== undefined && getPlatform() !== "windows") {
      await setupCache();
      await exec("opam", [
        "init",
        "default",
        "https://github.com/ocaml/opam-repository.git",
        "--compiler",
        `ocaml-system.${OCAML_VERSION}`,
        "--auto-setup",
        "--verbose",
      ]);
    } else {
      throw new Error("The environment does not support cache-based set up.");
    }
  } catch (error) {
    await exec("opam", [
      "init",
      "default",
      "https://github.com/ocaml/opam-repository.git",
      "--compiler",
      `ocaml-base-compiler.${OCAML_VERSION}`,
      "--auto-setup",
      "--verbose",
    ]);
  }
}

async function acquireOpamUnix() {
  core.startGroup("Install opam");
  await setupOpamUnix();
  core.endGroup();
  core.startGroup("Initialise the opam state");
  await initializeOpamUnix();
  core.endGroup();
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
  const setupExePath = await io.which("setup-x86_64.exe", true);
  await exec(setupExePath, [
    "--quiet-mode",
    "--root",
    root,
    "--site",
    site,
    "--packages",
    packages,
  ]);
  await io.cp(setupExePath, root);
  core.addPath(`${root}\\bin`);
}

async function setupOpamWindows() {
  async function install(path: string) {
    const installSh = `${path}\\opam64\\install.sh`;
    await fs.chmod(installSh, 755);
    await exec(bashPath, [installSh, "--prefix", "/usr"]);
  }
  const bashPath = await io.which("bash", true);
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

async function getCygwinVersion() {
  const { body: website } = await got("https://www.cygwin.com");
  const dom = new JSDOM(website);
  const links = dom.window.document.querySelectorAll("a");
  let version = "";
  links.forEach(({ textContent }) => {
    const text = textContent?.trim();
    if (semver.valid(text) === text) {
      version = text;
    }
  });
  return version;
}

async function initializeOpamWindows() {
  await exec("opam", [
    "init",
    "default",
    "https://github.com/fdopen/opam-repository-mingw.git#opam2",
    "--compiler",
    `ocaml-variants.${OCAML_VERSION}+mingw64c`,
    "--auto-setup",
    "--disable-sandboxing",
    "--enable-completion",
    "--enable-shell-hook",
    "--verbose",
  ]);
}

async function acquireOpamWindows() {
  core.startGroup("Prepare Cygwin environment");
  await setupCygwin();
  core.endGroup();
  core.startGroup("Install opam");
  await setupOpamWindows();
  core.endGroup();
  core.startGroup("Initialise the opam state");
  await initializeOpamWindows();
  core.endGroup();
}

export async function acquireOpam(): Promise<void> {
  const numberOfProcessors = os.cpus().length;
  const jobs = numberOfProcessors + 2;
  core.exportVariable("OPAMJOBS", jobs);
  core.exportVariable("OPAMYES", 1);
  if (IS_WINDOWS) {
    core.exportVariable("OPAM_LINT", false);
    await acquireOpamWindows();
  } else {
    await acquireOpamUnix();
  }
}

export async function installDepext(): Promise<void> {
  core.startGroup("Install depext");
  await opamExec(["install", "depext"]);
  core.endGroup();
}
