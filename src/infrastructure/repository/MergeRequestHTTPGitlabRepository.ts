import { MergeRequest, MergeRequestRepository } from "../../merge-requests/MergeRequest.js";
import { Repository } from "../../Repository.js";
import parseLinkHeader from "parse-link-header";
import { compareAsc, compareDesc, parseISO } from "date-fns";

type HTTPInit = { url: string; headers: [string, string][] | Record<string, string> | Headers };

abstract class GitRepository<T> implements Repository<T> {
  protected readonly repositoryUrl: string;

  paginate = (
    url: string,
    result: MergeRequest[],
    headers: [string, string][] | Record<string, string> | Headers,
    mergeRequests: (payload: MergeRequestDTO[]) => MergeRequest[]
  ): Promise<MergeRequest[]> => {
    return fetch(url, { headers }).then(async (response) => {
      const links = parseLinkHeader(response.headers.get("link"));
      const payload = await response.json();
      result.push(...mergeRequests(payload));
      if (links["next"] !== undefined) {
        return this.paginate(links["next"].url, result, headers, mergeRequests).then((mrs) => mrs);
      }
      return Promise.resolve(result);
    });
  };

  persist(entity: T) {
    throw new Error("Not implemented");
  }

  protected isMergeRequestInExpectedPeriod(mr: MergeRequest, fromDate: Date, toDate: Date) {
    return compareAsc(mr.createdAt, fromDate) >= 0 && compareDesc(mr.createdAt, toDate) >= 0;
  }

  protected fetchMergeRequestsForPeriod(
    init: HTTPInit,
    fromDate: Date,
    toDate: Date,
    mergeRequests: (payload: MergeRequestDTO[]) => MergeRequest[]
  ) {
    return fetch(init.url, { headers: init.headers }).then(async (response) => {
      const links = parseLinkHeader(response.headers.get("link"));
      const payload = await response.json();
      const requests = mergeRequests(payload);
      if (links["next"] !== undefined) {
        return this.paginate(links["next"].url, requests, init.headers, mergeRequests).then((mrs) =>
          mrs.filter((mr) => this.isMergeRequestInExpectedPeriod(mr, fromDate, toDate))
        );
      }
      return Promise.resolve(requests.filter((mr) => this.isMergeRequestInExpectedPeriod(mr, fromDate, toDate)));
    });
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

export class MergedRequestHTTPGitlabRepository extends GitRepository<MergeRequest> implements MergeRequestRepository {
  private _token: string;
  constructor(token: string, readonly repositoryUrl = "https://gitlab.com/api/v4/") {
    super();
    this._token = token;
  }

  getMergeRequestsForPeriod(projectId: number, fromDate: Date, toDate: Date): Promise<MergeRequest[]> {
    const init = this.httpInit(projectId, fromDate);
    return this.fetchMergeRequestsForPeriod(init, fromDate, toDate, (payload): MergeRequest[] =>
      (payload as MergeRequestDTO[]).map((mr) => fromDTO(mr))
    );
  }

  private httpInit(projectId: number, fromDate: Date): HTTPInit {
    const headers = { "PRIVATE-TOKEN": this._token };
    const url = `${
      this.repositoryUrl
    }projects/${projectId}/merge_requests?created_after=${fromDate.toISOString()}&per_page=100`;
    return { headers, url };
  }
}
