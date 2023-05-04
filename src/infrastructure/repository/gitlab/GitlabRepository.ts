import { GitEvent } from "../../../statistics/Statistics.js";
import { EventHTTPRepository, HTTPInit } from "../EventHTTPRepository.js";
import { GitlabEventParameters } from "../../../statistics/Gitlab.js";
import { AxiosHeaders } from "axios";

export abstract class GitlabRepository<T, U extends GitEvent> extends EventHTTPRepository<T, U> {
  protected constructor(private readonly token: string, readonly repositoryUrl = "https://gitlab.com/api/v4/") {
    super();
  }

  protected httpInit(requestParameters: GitlabEventParameters): HTTPInit {
    const _headers = { "PRIVATE-TOKEN": this.token };
    const url = `${this.repositoryUrl}projects/${requestParameters.projectId}/${
      this.path
    }?created_after=${requestParameters.fromDate.toISOString()}&per_page=100`;
    const axiosHeaders = new AxiosHeaders({ "PRIVATE-TOKEN": this.token });
    return { headers: _headers, url, config: { headers: axiosHeaders } };
  }

  protected abstract get path(): string;
}
