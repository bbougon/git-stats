import { IssueEvent, State } from "../../../statistics/issues/Issues.js";
import { PullRequestsStatsParameter } from "../../../statistics/Github.js";
import { parseISO } from "date-fns";
import { GithubRepository } from "./GithubRepository.js";

export type IssueEventGithubDTO = {
  id: number;
  state: string | "open" | "closed";
  closed_at: string | null;
  created_at: string;
  repository: { name: string };
};
const fromDTO = (dto: IssueEventGithubDTO): IssueEvent => {
  const stateMap: Map<string, State> = new Map<string, string>([
    ["closed", "closed"],
    ["open", "opened"],
  ]);
  return {
    closedAt: dto.closed_at !== null ? parseISO(dto.closed_at) : null,
    id: dto.id,
    project: dto.repository.name,
    start: parseISO(dto.created_at),
    state: stateMap.get(dto.state),
  };
};

export class IssueHTTPGithubRepository extends GithubRepository<IssueEventGithubDTO, IssueEvent> {
  constructor(token: string) {
    super(token);
  }

  protected projectInfos(requestParameters: PullRequestsStatsParameter): string {
    return `owner: ${requestParameters.owner} - repository: ${requestParameters.repo}`;
  }

  protected fromDTO(dto: IssueEventGithubDTO): IssueEvent {
    return fromDTO(dto);
  }

  protected get path(): string {
    return "issues";
  }
}
