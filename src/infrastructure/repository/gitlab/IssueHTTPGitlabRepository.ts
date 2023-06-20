import { IssueEvent } from "../../../statistics/issues/Issues.js";
import { parseISO } from "date-fns";
import { GitlabEventParameters } from "../../../statistics/Gitlab.js";
import { GitlabRepository } from "./GitlabRepository.js";
import { EventType } from "../EventHTTPRepository.js";

export type IssueEventDTO = {
  id: number;
  created_at: string;
  closed_at: string;
  state: string | "opened" | "closed";
  project_id: number | string;
};

const fromDTO = (dto: IssueEventDTO): IssueEvent => {
  return {
    closedAt: dto.closed_at !== null ? parseISO(dto.closed_at) : null,
    id: dto.id,
    project: dto.project_id,
    start: parseISO(dto.created_at),
    state: dto.state,
  };
};

export class IssueHTTPGitlabRepository extends GitlabRepository<IssueEventDTO, IssueEvent> {
  constructor(token: string) {
    super(token);
  }

  protected projectInfos(requestParameters: GitlabEventParameters): string {
    return String(requestParameters.projectId);
  }

  protected fromDTO(dto: IssueEventDTO): IssueEvent {
    return fromDTO(dto);
  }

  protected get path(): string {
    return "issues";
  }

  protected eventType(): EventType {
    return "issues";
  }
}
