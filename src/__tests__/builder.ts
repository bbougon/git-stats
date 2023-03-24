import * as crypto from "crypto";
import { MergeRequest } from "../merge-requests/MergeRequest";

export class MergeRequestBuilder {
  private projectId: number;
  private id: number;
  private _createdAt: Date;
  private _mergedAt: Date;
  private closedAt: Date | null = null;

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
    this._mergedAt = null;
    this.closedAt = null;
    return this;
  };

  closed = (closedAt: Date): MergeRequestBuilder => {
    this.closedAt = closedAt;
    this._mergedAt = null;
    return this;
  };

  build = (): MergeRequest => {
    return {
      createdAt: this._createdAt,
      mergedAt: this._mergedAt,
      closedAt: this.closedAt,
      projectId: this.projectId,
      id: this.id,
    };
  };
}
