import * as crypto from "crypto";
import { MergeRequest } from "../merge-requests/MergeRequest";

export class MergeRequestBuilder {
  private projectId: number;
  private id: number;
  private _createdAt: Date;
  private _mergedAt: Date;

  constructor(projectId: number) {
    this.projectId = projectId;
    this.id = crypto.randomInt(2 ^ 16);
  }

  createdAt = (createdAt: Date): MergeRequestBuilder => {
    this._createdAt = createdAt;
    return this;
  };

  mergedAt = (mergedAt: Date): MergeRequestBuilder => {
    this._mergedAt = mergedAt;
    return this;
  };

  notYetMerged = (): MergeRequestBuilder => {
    this._mergedAt = undefined;
    return this;
  };

  build = (): MergeRequest => {
    return {
      createdAt: this._createdAt,
      mergedAt: this._mergedAt,
      projectId: this.projectId,
      id: this.id,
    };
  };
}
