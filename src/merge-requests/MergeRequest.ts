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

type MergeRequestStatsResult = { average: { days: number; hours: number }; total: number };

export class MergeRequestStats {
  private mergeRequests: MergeRequest[];

  constructor(mergeRequests: MergeRequest[]) {
    this.mergeRequests = mergeRequests;
  }

  result = (): MergeRequestStatsResult => {
    const hoursSpent = this.mergeRequests.reduce(
      (accumulator, currentValue) => accumulator + differenceInHours(currentValue.mergedAt, currentValue.createdAt),
      0
    );
    return {
      average: {
        days: parseFloat((hoursSpent / 24 / this.mergeRequests.length).toFixed(2)),
        hours: parseFloat((hoursSpent / this.mergeRequests.length).toFixed(2)),
      },
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
