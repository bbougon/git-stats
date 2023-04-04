import { compareAsc, differenceInHours, getMonth, getWeek, intervalToDuration } from "date-fns";
import { Repository } from "../Repository.js";
import { RequestParameters } from "../../index.js";
import moment from "moment";

export type MergeEvent = {
  project: number | string | undefined;
  id: number;
  createdAt: Date;
  mergedAt: Date | null;
  closedAt: Date | null;
};

export interface MergeEventRepository extends Repository<MergeEvent> {
  getMergeEventsForPeriod(requestParameters: RequestParameters): Promise<MergeEvent[]>;
}

type MergeEventsStatisticsResult = {
  average: {
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  total: {
    merged: number;
    closed: number;
    opened: number;
    all: number;
  };
};

type Period = { start: Date; end: Date };

export class GitStatistics {
  constructor(private readonly mergeEvents: MergeEvent[], public readonly period: Period) {}

  public sortedMergeEvents(): MergeEvent[] {
    return this.mergeEvents
      .sort((mr, mrToCompare) => compareAsc(mr.createdAt, mrToCompare.createdAt))
      .sort((mr, mrToCompare) => compareAsc(mr.mergedAt, mrToCompare.mergedAt));
  }

  result = (): MergeEventsStatisticsResult => {
    const mergedMergeRequests = this.mergeEvents.filter((mr) => mr.mergedAt !== null);
    const closedMergeRequests = this.mergeEvents.filter((mr) => mr.closedAt !== null);
    const openedMergeRequests = this.mergeEvents.filter((mr) => mr.mergedAt === null && mr.closedAt == null);
    const hoursSpent = mergedMergeRequests.reduce(
      (accumulator, currentValue) => accumulator + differenceInHours(currentValue.mergedAt, currentValue.createdAt),
      0
    );
    const duration = moment.duration(hoursSpent / mergedMergeRequests.length, "hours");
    return {
      average: {
        months: parseInt(duration.months().toFixed()),
        days: parseInt(duration.days().toFixed()),
        hours: parseInt(duration.hours().toFixed()),
        minutes: parseInt(duration.minutes().toFixed()),
        seconds: parseInt(duration.seconds().toFixed()),
      },
      total: {
        merged: mergedMergeRequests.length,
        closed: closedMergeRequests.length,
        opened: openedMergeRequests.length,
        all: this.mergeEvents.length,
      },
    };
  };
}

export const mergeEventsStatistics = (
  requestParameter: RequestParameters,
  repository: MergeEventRepository
): Promise<GitStatistics> => {
  return repository.getMergeEventsForPeriod(requestParameter).then((mergeEvents) => {
    return new GitStatistics(mergeEvents, { end: requestParameter.toDate, start: requestParameter.fromDate });
  });
};

type Unit = string | "Week" | "Month";
export class Dimension {
  private constructor(public readonly unit: Unit, public readonly index: number, public mr: number) {}

  static create(unit: Unit, index: number) {
    return new Dimension(unit, index, 1);
  }

  increase() {
    this.mr = this.mr + 1;
  }

  static empty(unit: Unit, index: number) {
    return new Dimension(unit, index, 0);
  }
}

function fillEmptyPeriodsAndSortChronologically(
  stats: [number, [number, Dimension][]][],
  unit: string,
  period: Period
) {
  const result: Dimension[] = [];

  const fillPeriodTail = (stat: [number, [number, Dimension][]], dimensions: Dimension[]): void => {
    let periodEndIndex: number | undefined = undefined;
    if (stat[0] === period.end.getFullYear()) {
      periodEndIndex = unit === "Week" ? getWeek(period.end) : getMonth(period.end);
    }
    if (
      periodEndIndex !== undefined &&
      dimensions.find((dimension) => dimension.index === periodEndIndex) === undefined
    ) {
      const dimensionsLength = Math.max(...dimensions.map((dimension) => dimension.index));
      for (let i = 0; i < periodEndIndex - dimensionsLength; i++) {
        dimensions.push(Dimension.empty(unit, periodEndIndex - i));
      }
    }
  };

  const fillPeriodInterval = (stat: [number, [number, Dimension][]], dimensions: Dimension[]): void => {
    const periods = dimensions.map((val) => val.index);
    const periodStartIndex =
      stat[0] === period.start.getFullYear() ? (unit === "Week" ? getWeek(period.start) : getMonth(period.start)) : 0;
    for (let i = 0; i < periodStartIndex + periods.length; i++) {
      if (periodStartIndex <= i) {
        let j = i;
        while (j < periods[i - periodStartIndex]) {
          if (dimensions.find((dimension) => dimension.index === j) === undefined) {
            dimensions.push(Dimension.empty(unit, j));
          }
          j++;
        }
      }
    }
  };

  stats.forEach((stat) => {
    const flattenDimensions = stat[1]
      .flatMap((val) => val[1])
      .flatMap((val) => val)
      .sort((dimension, nextDimension) => (dimension.index > nextDimension.index ? 1 : -1));
    fillPeriodInterval(stat, flattenDimensions);
    fillPeriodTail(stat, flattenDimensions);
    result.push(...flattenDimensions.sort((stat, nextStat) => (stat.index > nextStat.index ? 1 : -1)));
  });
  return result;
}

export const mergeEventsByPeriod = (mergeEventsStatistics: GitStatistics): Dimension[] => {
  const stats: [number, [number, Dimension][]][] = [];
  const duration = intervalToDuration({
    start: mergeEventsStatistics.period.start,
    end: mergeEventsStatistics.period.end,
  });
  const moreThan2Months = duration.months > 1 && duration.months + duration.days > 2;
  const unit = moreThan2Months ? "Month" : "Week";
  mergeEventsStatistics
    .sortedMergeEvents()
    .filter((mr) => mr.mergedAt !== null)
    .forEach((mr) => {
      const year = mr.mergedAt.getFullYear();
      const dimension = Dimension.create(unit, moreThan2Months ? getMonth(mr.mergedAt) : getWeek(mr.mergedAt));
      if (stats.length === 0) {
        stats.push([year, [[dimension.index, dimension]]]);
      } else {
        const yearStats = stats.filter((stat) => stat[0] === year);
        if (yearStats.length === 0) {
          stats.push([year, [[dimension.index, dimension]]]);
        } else {
          const periodStats = yearStats[0][1].filter((stat) => stat[0] === dimension.index);
          if (periodStats.length === 0) {
            yearStats[0][1].push([dimension.index, dimension]);
          } else {
            const dimension = periodStats[0][1];
            dimension.increase();
          }
        }
      }
    });
  return fillEmptyPeriodsAndSortChronologically(stats, unit, mergeEventsStatistics.period);
};
