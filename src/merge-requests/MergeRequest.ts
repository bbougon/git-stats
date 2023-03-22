import crypto from "crypto";
import { differenceInHours } from "date-fns";
import { Repository } from "../Repository";

export type MergeRequest = {
  projectId: number;
  uuid: crypto.UUID;
  createdAt: Date;
  mergedAt: Date;
};

export interface MergeRequestRepository extends Repository<MergeRequest> {
  getMergeRequestsForPeriod(projectId: number, fromDate: Date, toDate: Date): Promise<MergeRequest[]>;
}

type MergeRequestsStatsParameters = {
  fromDate: Date;
  toDate: Date;
  projectId: number;
};

export class MergeRequestStats {
  private mergeRequests: MergeRequest[];

  constructor(mergeRequests: MergeRequest[]) {
    this.mergeRequests = mergeRequests;
  }

  result = (): { average: number; total: number } => {
    return {
      average:
        this.mergeRequests.reduce(
          (accumulator, currentValue) =>
            accumulator + differenceInHours(currentValue.mergedAt, currentValue.createdAt) / 24,
          0
        ) / this.mergeRequests.length,
      total: this.mergeRequests.length,
    };
  };
}

export const mergeRequestsStats = (
  requestParameter: MergeRequestsStatsParameters,
  repository: MergeRequestRepository
): Promise<MergeRequestStats> => {
  return repository
    .getMergeRequestsForPeriod(requestParameter.projectId, requestParameter.fromDate, requestParameter.toDate)
    .then((mergeRequests) => {
      return new MergeRequestStats(mergeRequests);
    });
};
