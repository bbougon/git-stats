import { Repository } from "../../Repository.js";
import parseLinkHeader, { Links } from "parse-link-header";
import { compareAsc, compareDesc } from "date-fns";
import { RequestParameters } from "../../../index.js";
import { MergeEvent } from "../../statistics/merge-events/MergeEvent.js";
import { progressBar } from "../progress-bar/ProgressBar.js";

export type HTTPInit = { url: string; headers: [string, string][] | Record<string, string> | Headers };

export abstract class GitRepository<T> implements Repository<T> {
  protected readonly repositoryUrl: string;

  getMergeEventsForPeriod(requestParameters: RequestParameters): Promise<MergeEvent[]> {
    const init = this.httpInit(requestParameters);
    return this.fetchMergeRequestsForPeriod(
      init,
      requestParameters.fromDate,
      requestParameters.toDate,
      this.mergeRequestsMapper()
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  persist(entity: T) {
    throw new Error("Not implemented");
  }

  @progressBar("Paginate")
  private paginate(
    links: Links,
    result: MergeEvent[],
    headers: [string, string][] | Record<string, string> | Headers,
    mergeRequests: (payload: MergeEventDTO[]) => MergeEvent[]
  ): Promise<MergeEvent[]> {
    if (links !== null && links["next"] !== undefined) {
      return fetch(links["next"].url, { headers }).then(async (response) => {
        const links = parseLinkHeader(response.headers.get("link"));
        const payload = await response.json();
        result.push(...mergeRequests(payload));
        return this.paginate(links, result, headers, mergeRequests).then((mrs) => mrs);
      });
    }
    return Promise.resolve(result);
  }

  private isMergeRequestInExpectedPeriod = (mr: MergeEvent, fromDate: Date, toDate: Date): boolean => {
    return compareAsc(mr.createdAt, fromDate) >= 0 && compareDesc(mr.createdAt, toDate) >= 0;
  };

  private fetchMergeRequestsForPeriod = (
    init: HTTPInit,
    fromDate: Date,
    toDate: Date,
    mergeRequests: (payload: MergeEventDTO[]) => MergeEvent[]
  ): Promise<MergeEvent[]> => {
    return fetch(init.url, { headers: init.headers }).then(async (response) => {
      const links = parseLinkHeader(response.headers.get("link"));
      const payload = await response.json();
      const requests = mergeRequests(payload);
      return this.paginate(links, requests, init.headers, mergeRequests).then((mrs) =>
        mrs.filter((mr) => this.isMergeRequestInExpectedPeriod(mr, fromDate, toDate))
      );
    });
  };

  protected abstract httpInit(requestParameters: RequestParameters): HTTPInit;

  protected abstract mergeRequestsMapper(): (payload: MergeEventDTO[]) => MergeEvent[];
}

export type MergeEventDTO = object;
