import { RequestParameters } from "../../index.js";

export type GitlabEventParameters = RequestParameters & {
  projectId: number;
};
