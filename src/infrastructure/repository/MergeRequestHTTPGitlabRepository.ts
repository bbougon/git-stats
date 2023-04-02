import {
  MergeRequest,
  MergeRequestRepository,
  MergeRequestsStatsParameters,
} from "../../merge-requests/MergeRequest.js";
import { parseISO } from "date-fns";
import { GitRepository, HTTPInit, MergeRequestDTO } from "./GitRepository.js";

type GitlabMergeRequestDTO = MergeRequestDTO & {
  id: number;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  project_id: number;
};

const fromDTO = (mergeRequestDTO: GitlabMergeRequestDTO): MergeRequest => {
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

export class MergedRequestHTTPGitlabRepository extends GitRepository<MergeRequest> implements MergeRequestRepository {
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

  protected mergeRequestsMapper = (): ((payload: MergeRequestDTO[]) => MergeRequest[]) => {
    return (payload: MergeRequestDTO[]): MergeRequest[] =>
      (payload as GitlabMergeRequestDTO[]).map((mr) => fromDTO(mr));
  };
}
