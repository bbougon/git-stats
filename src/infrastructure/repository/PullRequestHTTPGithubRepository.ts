import { GitRepository, HTTPInit, MergeEventDTO } from "./GitRepository.js";
import { MergeEventRepository, MergeEvent } from "../../merge-events/MergeEvent.js";
import { parseISO } from "date-fns";
import { PullRequestsStatsParameter } from "../../merge-events/Github.js";

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
    createdAt: parseISO(pullRequestDTO.created_at),
    id: pullRequestDTO.id,
    mergedAt: parseDate(pullRequestDTO.merged_at),
    project: pullRequestDTO.head.repo?.name,
  };
};

export class PullRequestHTTPGithubRepository extends GitRepository<MergeEvent> implements MergeEventRepository {
  constructor(private readonly token: string, readonly repositoryUrl = "https://api.github.com/repos") {
    super();
  }

  protected httpInit(requestParameters: PullRequestsStatsParameter): HTTPInit {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const url = `${this.repositoryUrl}/${requestParameters.owner}/${requestParameters.repo}/pulls?state=all&sort=created&per_page=100`;
    return { headers, url };
  }

  protected mergeRequestsMapper(): (payload: MergeEventDTO[]) => MergeEvent[] {
    return (payload: MergeEventDTO[]): MergeEvent[] => (payload as PullRequestDTO[]).map((mr) => fromDTO(mr));
  }
}
