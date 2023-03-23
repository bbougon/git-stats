import { differenceInHours } from "date-fns";
import { Repository } from "../Repository";

export type MergeRequest = {
  projectId: number;
  id: number;
  createdAt: Date;
  mergedAt: Date;
};

export interface MergeRequestRepository extends Repository<MergeRequest> {
  getMergeRequestsForPeriod(projectId: number, fromDate: Date, toDate: Date): Promise<MergeRequest[]>;
}

export type MergeRequestsStatsParameters = {
  fromDate: Date;
  toDate: Date;
  projectId: number;
};

type MergeRequestStatsResult = {
  average: {
    days: number;
    hours: number;
  };
  total: {
    closed: number;
    all: number;
  };
};

export class MergeRequestStats {
  private mergeRequests: MergeRequest[];

  constructor(mergeRequests: MergeRequest[]) {
    this.mergeRequests = mergeRequests;
  }

  result = (): MergeRequestStatsResult => {
    const mergedMergeRequests = this.mergeRequests.filter((mr) => mr.mergedAt !== null);
    const hoursSpent = mergedMergeRequests.reduce(
      (accumulator, currentValue) => accumulator + differenceInHours(currentValue.mergedAt, currentValue.createdAt),
      0
    );
    return {
      average: {
        days: parseFloat((hoursSpent / 24 / mergedMergeRequests.length).toFixed(2)),
        hours: parseFloat((hoursSpent / mergedMergeRequests.length).toFixed(2)),
      },
      total: {
        closed: mergedMergeRequests.length,
        all: this.mergeRequests.length,
      },
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
