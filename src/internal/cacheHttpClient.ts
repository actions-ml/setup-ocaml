import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";
import * as tc from "@actions/tool-cache";

import { BASE_URL, OCAML_VERSION } from "../constants";
import { makeImageName } from "./imageName";

function makeHttpClient() {
  return new HttpClient("ocaml/setup-ocaml", undefined, {
    allowRetries: true,
    maxRetries: 5,
  });
}

async function isFileExist(url: string) {
  const httpClient = makeHttpClient();

  const response = await httpClient.get(url);

  if (response.message.statusCode === 200) {
    return true;
  } else {
    return false;
  }
}

export async function setupCache(): Promise<void> {
  const IMAGE_NAME = await makeImageName();
  const url = `${BASE_URL}/${OCAML_VERSION}/${IMAGE_NAME}/${OCAML_VERSION}.tar.gz`;
  console.log(url);
  if (await isFileExist(url)) {
    const cachedPath = await tc.find("ocaml", OCAML_VERSION, IMAGE_NAME);
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
        IMAGE_NAME
      );
      core.addPath(`${cachedPath}/bin`);
    } else {
      core.addPath(`${cachedPath}/bin`);
    }
  } else {
    throw new Error("The cache is not found.");
  }
}
