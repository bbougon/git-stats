import { Repository } from "../../Repository.js";
import { MergeEvents } from "../../merge-events/MergeEvents.js";
import parseLinkHeader from "parse-link-header";
import { compareAsc, compareDesc } from "date-fns";
import { RequestParameters } from "../../../index.js";

export type HTTPInit = { url: string; headers: [string, string][] | Record<string, string> | Headers };

export abstract class GitRepository<T> implements Repository<T> {
  protected readonly repositoryUrl: string;

  getMergeEventsForPeriod(requestParameters: RequestParameters): Promise<MergeEvents[]> {
    const init = this.httpInit(requestParameters);
    return this.fetchMergeRequestsForPeriod(
      init,
      requestParameters.fromDate,
      requestParameters.toDate,
      this.mergeRequestsMapper()
    );
  }

  persist(entity: T) {
    throw new Error("Not implemented");
  }

  private paginate = (
    url: string,
    result: MergeEvents[],
    headers: [string, string][] | Record<string, string> | Headers,
    mergeRequests: (payload: MergeEventDTO[]) => MergeEvents[]
  ): Promise<MergeEvents[]> => {
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

  private isMergeRequestInExpectedPeriod = (mr: MergeEvents, fromDate: Date, toDate: Date): boolean => {
    return compareAsc(mr.createdAt, fromDate) >= 0 && compareDesc(mr.createdAt, toDate) >= 0;
  };

  private fetchMergeRequestsForPeriod = (
    init: HTTPInit,
    fromDate: Date,
    toDate: Date,
    mergeRequests: (payload: MergeEventDTO[]) => MergeEvents[]
  ): Promise<MergeEvents[]> => {
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
  };

  protected abstract httpInit(requestParameters: RequestParameters): HTTPInit;

  protected abstract mergeRequestsMapper(): (payload: MergeEventDTO[]) => MergeEvents[];
}

export type MergeEventDTO = object;
