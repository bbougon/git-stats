import { Repository } from "../../Repository.js";
import parseLinkHeader, { Links } from "parse-link-header";
import { compareAsc, compareDesc } from "date-fns";
import { RequestParameters } from "../../../index.js";
import { MergeEvent } from "../../statistics/merge-events/MergeEvent.js";
import { progressBar } from "../progress-bar/ProgressBar.js";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { axiosInstance } from "./axios.js";

export type HTTPInit = { url: string; headers: Record<string, string>; config: AxiosRequestConfig };

export abstract class GitHTTPRepository<T> implements Repository<T> {
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
    config: AxiosRequestConfig,
    mergeRequests: (payload: MergeEventDTO[]) => MergeEvent[]
  ): Promise<MergeEvent[]> {
    if (links !== null && links["next"] !== undefined) {
      return axiosInstance.get(links["next"].url, config).then((response: AxiosResponse<MergeEventDTO[]>) => {
        const links = parseLinkHeader(response.headers["link"]);
        result.push(...mergeRequests(response.data));
        return this.paginate(links, result, config, mergeRequests).then((mrs) => mrs);
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
    return axiosInstance.get(init.url, init.config).then((response: AxiosResponse<MergeEventDTO[]>) => {
      const links = parseLinkHeader(response.headers["link"]);
      const requests = mergeRequests(response.data);
      return this.paginate(links, requests, init.config, mergeRequests).then((mrs) =>
        mrs.filter((mr) => this.isMergeRequestInExpectedPeriod(mr, fromDate, toDate))
      );
    });
  };

  protected abstract httpInit(requestParameters: RequestParameters): HTTPInit;

  protected abstract mergeRequestsMapper(): (payload: MergeEventDTO[]) => MergeEvent[];
}

export type MergeEventDTO = object;
