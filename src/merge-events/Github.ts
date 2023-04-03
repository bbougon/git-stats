import { RequestParameters } from "../../index.js";

export type PullRequestsStatsParameter = RequestParameters & {
  repo: string;
  owner: string;
};
