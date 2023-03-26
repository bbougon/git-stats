import { compareAsc, differenceInHours, getMonth, getWeek, intervalToDuration } from "date-fns";
import { Repository } from "../Repository.js";

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
    opened: number;
    all: number;
  };
};

type Period = { start: Date; end: Date };

export class MergeRequestStats {
  constructor(private readonly mergeRequests: MergeRequest[], public readonly period: Period) {}

  public sortedMergeRequests(): MergeRequest[] {
    return this.mergeRequests
      .sort((mr, mrToCompare) => compareAsc(mr.createdAt, mrToCompare.createdAt))
      .sort((mr, mrToCompare) => compareAsc(mr.mergedAt, mrToCompare.mergedAt));
  }

  result = (): MergeRequestStatsResult => {
    const mergedMergeRequests = this.mergeRequests.filter((mr) => mr.mergedAt !== null);
    const closedMergeRequests = this.mergeRequests.filter((mr) => mr.closedAt !== null);
    const openedMergeRequests = this.mergeRequests.filter((mr) => mr.mergedAt === null && mr.closedAt == null);
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
        opened: openedMergeRequests.length,
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
      return new MergeRequestStats(mergeRequests, { end: requestParameter.toDate, start: requestParameter.fromDate });
    });
};

type Unit = string | "Week" | "Month";
export type Dimension = { unit: Unit; index: number; mr: number };

export const mergeRequestsByPeriod = (mergeRequestStats: MergeRequestStats): Dimension[] => {
  const stats: [number, [number, Dimension][]][] = [];
  const duration = intervalToDuration({ start: mergeRequestStats.period.start, end: mergeRequestStats.period.end });
  const moreThan2Months = duration.months > 1 && duration.months + duration.days > 2;
  const unit = moreThan2Months ? "Month" : "Week";
  mergeRequestStats
    .sortedMergeRequests()
    .filter((mr) => mr.mergedAt !== null)
    .forEach((mr) => {
      const year = mr.mergedAt.getFullYear();
      const index = moreThan2Months ? getMonth(mr.mergedAt) : getWeek(mr.mergedAt);
      if (stats.length === 0) {
        stats.push([year, [[index, { unit, index, mr: 1 }]]]);
      } else {
        const yearStats = stats.filter((stat) => stat[0] === year);
        if (yearStats.length === 0) {
          stats.push([year, [[index, { unit, index, mr: 1 }]]]);
        } else {
          const periodStats = yearStats[0][1].filter((stat) => stat[0] === index);
          if (periodStats.length === 0) {
            yearStats[0][1].push([index, { unit, index, mr: 1 }]);
          } else {
            const dimension = periodStats[0][1];
            dimension.mr = dimension.mr + 1;
          }
        }
      }
    });
  const result: Dimension[] = [];
  for (const stat of stats) {
    const flattenDimensions = stat[1].flatMap((val) => val[1]).flatMap((val) => val);
    const periods = flattenDimensions.map((val) => val.index);
    for (let i = 0; i < periods.length; i++) {
      if (i + 1 < periods.length && periods[i + 1] !== periods[i] + 1) {
        flattenDimensions.push({ unit, index: periods[i] + 1, mr: 0 });
      }
    }
    result.push(...flattenDimensions.sort((stat, nextStat) => (stat.index > nextStat.index ? 1 : -1)));
  }
  return result;
};
