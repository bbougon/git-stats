import { MergeRequest, MergeRequestRepository } from "../../merge-requests/MergeRequest";
import { Repository } from "../../Repository";
import * as parseLinkHeader from "parse-link-header";
import { parseISO } from "date-fns";

abstract class GitlabRepository<T> implements Repository<T> {
  protected readonly GITLABAPI: string = "https://gitlab.com/api/v4/";

  persist(entity: T) {
    throw new Error("Not implemented");
  }
}

export type MergeRequestDTO = {
  id: number;
  created_at: string;
  merged_at: string;
  project_id: number;
};

const fromDTO = (mergeRequestDTO: MergeRequestDTO): MergeRequest => {
  return {
    createdAt: parseISO(mergeRequestDTO.created_at),
    mergedAt: parseISO(mergeRequestDTO.merged_at),
    projectId: mergeRequestDTO.project_id,
    id: mergeRequestDTO.id,
  };
};

export class MergedRequestHTTPGitlabRepository
  extends GitlabRepository<MergeRequest>
  implements MergeRequestRepository
{
  getMergeRequestsForPeriod(projectId: number, fromDate: Date, toDate: Date): Promise<MergeRequest[]> {
    return fetch(
      `${this.GITLABAPI}projects/${projectId}/merge_requests?created_after=${fromDate.toISOString()}&per_page=100`
    ).then(async (response) => {
      const links = parseLinkHeader(response.headers.get("link"));
      const payload = await response.json();
      const requests = (payload as MergeRequestDTO[]).map((mr) => fromDTO(mr));
      if (links["'next'"] !== undefined) {
        return this.paginate(links["'next'"].url, requests).then((mrs) => mrs);
      }
      return Promise.resolve(requests);
    });
  }

  paginate = (url: string, result: MergeRequest[]): Promise<MergeRequest[]> => {
    return fetch(url).then(async (response) => {
      const links = parseLinkHeader(response.headers.get("link"));
      const payload = await response.json();
      const mergeRequestDTO = payload as MergeRequestDTO[];
      result.push(...mergeRequestDTO.map((mr) => fromDTO(mr)));
      if (links["'next'"]) {
        return this.paginate(links["'next'"].url, result).then((mrs) => mrs);
      }
      return Promise.resolve(result);
    });
  };
}
