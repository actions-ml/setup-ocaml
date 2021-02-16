import * as core from "@actions/core";
import * as github from "@actions/github";
import { HttpClient } from "@actions/http-client";
import * as tc from "@actions/tool-cache";
import * as path from "path";

import { composeImageName } from "./imageName";

const {
  repo: { owner, repo },
} = github.context;

export function makeHttpClient(): HttpClient {
  return new HttpClient(`ocaml/setup-ocaml (${owner}/${repo})`, [], {
    allowRetries: true,
    maxRetries: 5,
  });
}

export async function checkIfCacheFileExists(url: string): Promise<boolean> {
  const httpClient = makeHttpClient();
  const response = await httpClient.get(url);
  if (response.message.statusCode === 200) {
    return true;
  } else {
    return false;
  }
}

export async function retrieveCache(
  url: string,
  version: string
): Promise<void> {
  const imageName = await composeImageName();
  const cachedPath = await tc.find("ocaml", version, imageName);
  if (cachedPath === "") {
    const downloadedPath = await tc.downloadTool(url);
    const extractedPath = await tc.extractTar(downloadedPath, undefined, [
      "xz",
      "--strip-components",
      "1",
    ]);
    const cachedPath = await tc.cacheDir(
      extractedPath,
      "ocaml",
      version,
      imageName
    );
    core.addPath(path.join(cachedPath, "bin"));
  } else {
    core.addPath(path.join(cachedPath, "bin"));
  }
}
