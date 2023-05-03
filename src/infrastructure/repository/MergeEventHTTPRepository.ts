import parseLinkHeader, { Links } from "parse-link-header";
import { compareAsc, compareDesc } from "date-fns";
import { RequestParameters } from "../../../index.js";
import { MergeEvent, MergeEventRepository } from "../../statistics/merge-events/MergeEvent.js";
import { progressBar } from "../progress-bar/ProgressBar.js";
import { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { axiosInstance } from "./axios.js";

export type HTTPInit = { url: string; headers: Record<string, string>; config: AxiosRequestConfig };
export type HTTPError = { rationale: string; additionalInfo: unknown };

export abstract class MergeEventHTTPRepository implements MergeEventRepository {
  protected readonly repositoryUrl: string;

  getMergeEventsForPeriod(requestParameters: RequestParameters): Promise<MergeEvent[]> {
    const init = this.httpInit(requestParameters);
    return this.fetchMergeRequestsForPeriod(
      init,
      requestParameters.fromDate,
      requestParameters.toDate,
      this.mergeRequestsMapper()
    )
      .then((mergeEvents) => {
        return mergeEvents
          .sort((mr, mrToCompare) => compareAsc(mr.start, mrToCompare.start))
          .sort((mr, mrToCompare) => compareAsc(mr.mergedAt, mrToCompare.mergedAt));
      })
      .catch((reason: AxiosError) => {
        const httpError: HTTPError = {
          rationale: `We were unable to retrieve some informations on your project '${this.projectInfos(
            requestParameters
          )}'`,
          additionalInfo: reason.response.data,
        };
        return Promise.reject(httpError);
      });
  }

  persist(_entity: MergeEvent) {
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
    return compareAsc(mr.start, fromDate) >= 0 && compareDesc(mr.start, toDate) >= 0;
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

  protected abstract projectInfos(requestParameters: RequestParameters): string;
}

export type MergeEventDTO = object;
