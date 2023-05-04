import parseLinkHeader from "parse-link-header";
import { compareAsc, compareDesc } from "date-fns";
import { RequestParameters } from "../../../index.js";
import { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { axiosInstance } from "./axios.js";
import { PaginateRepository } from "./PaginateRepository.js";
import { GitEvent } from "../../statistics/Statistics.js";
import { EventRepository } from "../../statistics/EventRepository.js";

export type HTTPInit = { url: string; headers: Record<string, string>; config: AxiosRequestConfig };
export type HTTPError = { rationale: string; additionalInfo: unknown };

export abstract class EventHTTPRepository<T, U extends GitEvent>
  extends PaginateRepository<T, U>
  implements EventRepository<U>
{
  protected readonly repositoryUrl: string;

  getEventsForPeriod(requestParameters: RequestParameters): Promise<U[]> {
    const init = this.httpInit(requestParameters);
    return this.fetchEventsForPeriod(init, requestParameters.fromDate, requestParameters.toDate, this.eventMapper())
      .then((events) => {
        return events.sort((event, eventToCompare) => compareAsc(event.start, eventToCompare.start));
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

  persist(_entity: U) {
    throw new Error("Not implemented");
  }

  private isEventInExpectedPeriod = (event: U, fromDate: Date, toDate: Date): boolean => {
    return compareAsc(event.start, fromDate) >= 0 && compareDesc(event.start, toDate) >= 0;
  };

  private fetchEventsForPeriod = (
    init: HTTPInit,
    fromDate: Date,
    toDate: Date,
    events: (payload: T[]) => U[]
  ): Promise<U[]> => {
    return axiosInstance.get(init.url, init.config).then((response: AxiosResponse<T[]>) => {
      const links = parseLinkHeader(response.headers["link"]);
      const requests = events(response.data);
      return this.paginate(links, requests, init.config, events).then((evts) =>
        evts.filter((event) => this.isEventInExpectedPeriod(event, fromDate, toDate))
      );
    });
  };

  protected abstract httpInit(requestParameters: RequestParameters): HTTPInit;

  protected eventMapper = (): ((payload: T[]) => U[]) => {
    return (payload: T[]): U[] => payload.map((mr) => this.fromDTO(mr));
  };

  protected abstract fromDTO(dto: T): U;

  protected abstract projectInfos(requestParameters: RequestParameters): string;
}

export type MergeEventDTO = object;
