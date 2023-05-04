import { parseISO } from "date-fns";
import { MergeEventDTO } from "../EventHTTPRepository.js";
import { MergeEvent } from "../../../statistics/merge-events/MergeEvent.js";
import { GitlabEventParameters } from "../../../statistics/Gitlab.js";
import { GitlabRepository } from "./GitlabRepository.js";

type GitlabMergeRequestDTO = MergeEventDTO & {
  id: number;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  project_id: number;
};

const fromDTO = (mergeRequestDTO: GitlabMergeRequestDTO): MergeEvent => {
  const parseDate = (date: string | null): Date | null => {
    return date !== null ? parseISO(date) : null;
  };
  return {
    start: parseISO(mergeRequestDTO.created_at),
    mergedAt: parseDate(mergeRequestDTO.merged_at),
    closedAt: parseDate(mergeRequestDTO.closed_at),
    project: mergeRequestDTO.project_id,
    id: mergeRequestDTO.id,
  };
};

export class MergedRequestHTTPGitlabRepository extends GitlabRepository<GitlabMergeRequestDTO, MergeEvent> {
  constructor(token: string) {
    super(token);
  }

  protected projectInfos(requestParameters: GitlabEventParameters): string {
    return String(requestParameters.projectId);
  }

  protected fromDTO(dto: GitlabMergeRequestDTO) {
    return fromDTO(dto as GitlabMergeRequestDTO);
  }

  protected get path(): string {
    return "merge_requests";
  }
}
