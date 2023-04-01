import { MergeRequest, MergeRequestRepository } from "../../merge-requests/MergeRequest.js";
import { Repository } from "../../Repository.js";
import parseLinkHeader from "parse-link-header";
import { compareAsc, compareDesc, parseISO } from "date-fns";

abstract class GitlabRepository<T> implements Repository<T> {
  protected readonly GITLABAPI: string = "https://gitlab.com/api/v4/";

  persist(entity: T) {
    throw new Error("Not implemented");
  }
}

export type MergeRequestDTO = {
  id: number;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  project_id: number;
};

const fromDTO = (mergeRequestDTO: MergeRequestDTO): MergeRequest => {
  const parseDate = (date: string | null): Date | null => {
    return date !== null ? parseISO(date) : null;
  };
  return {
    createdAt: parseISO(mergeRequestDTO.created_at),
    mergedAt: parseDate(mergeRequestDTO.merged_at),
    closedAt: parseDate(mergeRequestDTO.closed_at),
    projectId: mergeRequestDTO.project_id,
    id: mergeRequestDTO.id,
  };
};

export class MergedRequestHTTPGitlabRepository
  extends GitlabRepository<MergeRequest>
  implements MergeRequestRepository
{
  private _token: string;
  constructor(token: string) {
    super();
    this._token = token;
  }

  getMergeRequestsForPeriod(projectId: number, fromDate: Date, toDate: Date): Promise<MergeRequest[]> {
    return fetch(
      `${this.GITLABAPI}projects/${projectId}/merge_requests?created_after=${fromDate.toISOString()}&per_page=100`,
      { headers: { "PRIVATE-TOKEN": this._token } }
    ).then(async (response) => {
      const links = parseLinkHeader(response.headers.get("link"));
      const payload = await response.json();
      const requests = (payload as MergeRequestDTO[]).map((mr) => fromDTO(mr));
      if (links["next"] !== undefined) {
        return this.paginate(links["next"].url, requests).then((mrs) =>
          mrs.filter((mr) => this.isMergeRequestInExpectedPeriod(mr, fromDate, toDate))
        );
      }
      return Promise.resolve(requests.filter((mr) => this.isMergeRequestInExpectedPeriod(mr, fromDate, toDate)));
    });
  }

  private isMergeRequestInExpectedPeriod(mr: MergeRequest, fromDate: Date, toDate: Date) {
    return compareAsc(mr.createdAt, fromDate) >= 0 && compareDesc(mr.createdAt, toDate) >= 0;
  }

  paginate = (url: string, result: MergeRequest[]): Promise<MergeRequest[]> => {
    return fetch(url, { headers: { "PRIVATE-TOKEN": this._token } }).then(async (response) => {
      const links = parseLinkHeader(response.headers.get("link"));
      const payload = await response.json();
      const mergeRequestDTO = payload as MergeRequestDTO[];
      result.push(...mergeRequestDTO.map((mr) => fromDTO(mr)));
      if (links["next"] !== undefined) {
        return this.paginate(links["next"].url, result).then((mrs) => mrs);
      }
      return Promise.resolve(result);
    });
  };
}
