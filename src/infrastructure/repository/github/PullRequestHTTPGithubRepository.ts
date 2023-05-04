import { parseISO } from "date-fns";
import { MergeEventDTO } from "../EventHTTPRepository.js";
import { MergeEvent } from "../../../statistics/merge-events/MergeEvent.js";
import { PullRequestsStatsParameter } from "../../../statistics/Github.js";
import { GithubRepository } from "./GithubRepository.js";

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

export class PullRequestHTTPGithubRepository extends GithubRepository<PullRequestDTO, MergeEvent> {
  constructor(token: string) {
    super(token);
  }

  protected projectInfos(requestParameters: PullRequestsStatsParameter): string {
    return `owner: ${requestParameters.owner} - repository: ${requestParameters.repo}`;
  }

  protected fromDTO(dto: PullRequestDTO): MergeEvent {
    return fromDTO(dto);
  }

  protected get path(): string {
    return "pulls";
  }
}
