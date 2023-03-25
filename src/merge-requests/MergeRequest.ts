import { compareAsc, differenceInHours, getWeek } from "date-fns";
import { Repository } from "../Repository";

export type MergeRequest = {
  projectId: number;
  id: number;
  createdAt: Date;
  mergedAt: Date | null;
  closedAt: Date | null;
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
    merged: number;
    closed: number;
    all: number;
  };
};

export class MergeRequestStats {
  private readonly _mergeRequests: MergeRequest[];

  constructor(mergeRequests: MergeRequest[]) {
    this._mergeRequests = mergeRequests;
  }

  public mergeRequests(): MergeRequest[] {
    return this._mergeRequests.sort((mr, mrToCompare) => compareAsc(mr.mergedAt, mrToCompare.mergedAt));
  }

  result = (): MergeRequestStatsResult => {
    const mergedMergeRequests = this._mergeRequests.filter((mr) => mr.mergedAt !== null);
    const closedMergeRequests = this._mergeRequests.filter((mr) => mr.closedAt !== null);
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
        merged: mergedMergeRequests.length,
        closed: closedMergeRequests.length,
        all: this._mergeRequests.length,
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

export type Period = string;

export const mergeRequestsByPeriod = (mergeRequestStats: MergeRequestStats): Map<Period, number> => {
  const stats: Map<Period, number> = new Map<Period, number>();
  mergeRequestStats
    .mergeRequests()
    .filter((mr) => mr.mergedAt !== null)
    .forEach((mr) => {
      const key = `Week ${getWeek(mr.mergedAt)}`;
      if (stats.has(key)) {
        stats.set(key, stats.get(key) + 1);
      } else {
        stats.set(key, 1);
      }
    });
  return stats;
};
