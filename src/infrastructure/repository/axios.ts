import axios, { AxiosInstance } from "axios";

class GitAxiosInstance {
  public static readonly gitAxiosInstance: GitAxiosInstance = null;
  readonly axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create();
  }

  public static axiosInstance(): GitAxiosInstance {
    if (this.gitAxiosInstance === null) {
      return new GitAxiosInstance();
    } else return this.gitAxiosInstance;
  }
}

export const axiosInstance = GitAxiosInstance.axiosInstance().axiosInstance;
