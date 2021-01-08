import * as github from "@actions/github";

import { GITHUB_TOKEN } from "../constants";

const octokit = github.getOctokit(GITHUB_TOKEN);

function versionCompare(v1: string, v2: string) {
  const v1a = v1.split(".");
  const v2a = v2.split(".");
  for (let i = 0; i < v1a.length; i++) {
    if (v2a.length === i) {
      return -1;
    }
    if (v1a[i] === v2a[i]) {
      continue;
    } else if (v1a[i] > v2a[i]) {
      return -1;
    } else {
      return 1;
    }
  }
  return 0;
}

function unique(array: string[]) {
  return Array.from(new Set(array));
}

async function getAllVersions() {
  const releases = [];
  const state = { continue: true, count: 0 };
  while (state.continue) {
    const response = await octokit.repos.listReleases({
      owner: "ocaml",
      repo: "ocaml",
      per_page: 100,
      page: state.count,
    });
    if (response.data.length > 0) {
      releases.push(...response.data);
      state.count++;
    } else {
      state.continue = false;
    }
  }
  const versions = unique(releases.map(({ tag_name }) => tag_name));
  return versions;
}

export async function resolveVersion(input: string): Promise<string> {
  const inputl = input.toLowerCase();
  if (inputl.includes("x") && inputl.includes("+")) {
    throw new Error(
      "The wildcard character is not supported for compiler version variants."
    );
  } else if (inputl.includes("x")) {
    const _versions = await getAllVersions();
    const ia = inputl.split(".");
    const versions = _versions.filter((version) => {
      const va = version.split(".");
      for (let i = 0; i < va.length; i++) {
        if (ia[i] === "x") {
          continue;
        } else if (ia[i] === va[i]) {
          continue;
        } else if (ia[i] !== va[i]) {
          return false;
        }
      }
      return true;
    });
    versions.sort(versionCompare);
    return versions[0];
  } else if (inputl === "latest") {
    const versions = await getAllVersions();
    versions.sort(versionCompare);
    return versions[0];
  } else {
    return input;
  }
}
