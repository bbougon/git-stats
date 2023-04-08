import { parseISO } from "date-fns";
import { GitRepository, HTTPInit, MergeEventDTO } from "./GitRepository.js";
import { MergeEvent, MergeEventRepository } from "../../statistics/merge-events/MergeEvent.js";
import { MergeRequestsStatsParameters } from "../../statistics/Gitlab.js";

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
    createdAt: parseISO(mergeRequestDTO.created_at),
    mergedAt: parseDate(mergeRequestDTO.merged_at),
    closedAt: parseDate(mergeRequestDTO.closed_at),
    project: mergeRequestDTO.project_id,
    id: mergeRequestDTO.id,
  };
};

export class MergedRequestHTTPGitlabRepository extends GitRepository<MergeEvent> implements MergeEventRepository {
  constructor(private readonly token: string, readonly repositoryUrl = "https://gitlab.com/api/v4/") {
    super();
  }

  protected httpInit = (requestParameters: MergeRequestsStatsParameters): HTTPInit => {
    const headers = { "PRIVATE-TOKEN": this.token };
    const url = `${this.repositoryUrl}projects/${
      requestParameters.projectId
    }/merge_requests?created_after=${requestParameters.fromDate.toISOString()}&per_page=100`;
    return { headers, url };
  };

  protected mergeRequestsMapper = (): ((payload: MergeEventDTO[]) => MergeEvent[]) => {
    return (payload: MergeEventDTO[]): MergeEvent[] => (payload as GitlabMergeRequestDTO[]).map((mr) => fromDTO(mr));
  };
}
