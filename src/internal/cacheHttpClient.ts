import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";
import * as tc from "@actions/tool-cache";

import { OCAML_VERSION } from "../constants";
import { makeImageName } from "./imageName";

export function makeHttpClient(): HttpClient {
  return new HttpClient("ocaml/setup-ocaml", [], {
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

export async function retrieveCache(url: string): Promise<void> {
  const imageName = await makeImageName();
  const cachedPath = await tc.find("ocaml", OCAML_VERSION, imageName);
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
      OCAML_VERSION,
      imageName
    );
    core.addPath(`${cachedPath}/bin`);
  } else {
    core.addPath(`${cachedPath}/bin`);
  }
}
