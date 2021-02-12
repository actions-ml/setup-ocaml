import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as github from "@actions/github";

import { GITHUB_TOKEN } from "./constants";

const octokit = github.getOctokit(GITHUB_TOKEN);

export async function installDune(): Promise<void> {
  core.startGroup("Install dune");
  await exec("opam", ["depext", "dune", "--install", "--yes"]);
  core.endGroup();
}

export async function trimDuneCache(): Promise<void> {
  core.startGroup("Remove oldest files from the dune cache to free space");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [owner, repo] = process.env.GITHUB_REPOSITORY!.split("/");
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const run_id = parseInt(process.env.GITHUB_RUN_ID!);
  const {
    data: { total_count: totalCount },
  } = await octokit.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id,
  });
  const cacheSize = Math.floor(5000 / totalCount);
  await exec("opam", [
    "exec",
    "--",
    "dune",
    "cache",
    "trim",
    "--size",
    `${cacheSize}MB`,
  ]);
  core.endGroup();
}
