import { MergeEventHTTPRepository, HTTPInit, MergeEventDTO } from "./MergeEventHTTPRepository.js";
import { parseISO } from "date-fns";
import { MergeEvent } from "../../statistics/merge-events/MergeEvent.js";
import { PullRequestsStatsParameter } from "../../statistics/Github.js";
import { AxiosHeaders } from "axios";

export type PullRequestDTO = MergeEventDTO & {
  created_at: string;
  id: number;
  head: { repo?: { name?: string } };
  merged_at: string | null;
  closed_at: string | null;
};
const fromDTO = (pullRequestDTO: PullRequestDTO): MergeEvent => {
  const parseDate = (date: string | null): Date | null => {
    return date !== null ? parseISO(date) : null;
  };
  return {
    closedAt: parseDate(pullRequestDTO.closed_at),
    start: parseISO(pullRequestDTO.created_at),
    id: pullRequestDTO.id,
    mergedAt: parseDate(pullRequestDTO.merged_at),
    project: pullRequestDTO.head.repo?.name,
  };
};

export class PullRequestHTTPGithubRepository extends MergeEventHTTPRepository {
  constructor(private readonly token: string, readonly repositoryUrl = "https://api.github.com/repos") {
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
    const url = `${this.repositoryUrl}/${requestParameters.owner}/${requestParameters.repo}/pulls?state=all&sort=created&per_page=100`;
    return { headers, url, config: { headers: axiosHeaders } };
  }

  protected mergeRequestsMapper(): (payload: MergeEventDTO[]) => MergeEvent[] {
    return (payload: MergeEventDTO[]): MergeEvent[] => (payload as PullRequestDTO[]).map((mr) => fromDTO(mr));
  }

  protected projectInfos(requestParameters: PullRequestsStatsParameter): string {
    return `owner: ${requestParameters.owner} - repository: ${requestParameters.repo}`;
  }
}
