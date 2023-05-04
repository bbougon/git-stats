import { GitEvent } from "../../../statistics/Statistics.js";
import { EventHTTPRepository, HTTPInit } from "../EventHTTPRepository.js";
import { PullRequestsStatsParameter } from "../../../statistics/Github.js";
import { AxiosHeaders } from "axios";

export abstract class GithubRepository<T, U extends GitEvent> extends EventHTTPRepository<T, U> {
  protected constructor(private readonly token: string, readonly repositoryUrl = "https://api.github.com/repos") {
    super();
  }

  protected httpInit(requestParameters: PullRequestsStatsParameter): HTTPInit {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const axiosHeaders = new AxiosHeaders({
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    });
    const url = `${this.repositoryUrl}/${requestParameters.owner}/${requestParameters.repo}/${this.path}?state=all&sort=created&per_page=100`;
    return { headers, url, config: { headers: axiosHeaders } };
  }

  protected abstract get path(): string;
}
