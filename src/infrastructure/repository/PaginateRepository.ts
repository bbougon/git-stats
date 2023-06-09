import { progressBar } from "../progress-bar/ProgressBar.js";
import parseLinkHeader, { Links } from "parse-link-header";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { axiosInstance } from "./axios.js";

export abstract class PaginateRepository<T, U> {
  @progressBar("Paginate")
  protected paginate(
    links: parseLinkHeader.Links,
    result: U[],
    config: AxiosRequestConfig,
    mergeRequests: (payload: T[]) => U[],
    origin: { eventType: string } | undefined
  ): Promise<U[]> {
    if (links !== null && links["next"] !== undefined) {
      return axiosInstance.get(links["next"].url, config).then((response: AxiosResponse<T[]>) => {
        const links = parseLinkHeader(response.headers["link"]);
        result.push(...mergeRequests(response.data));
        return this.paginate(links, result, config, mergeRequests, origin);
      });
    }
    return Promise.resolve(result);
  }
}
