import { MergeEventRepository, mergeEventsStatistics } from "./merge-events/MergeEvent.js";
import { getMonth, getWeek, intervalToDuration } from "date-fns";
import { RequestParameters } from "../../index.js";

type GitEvent = object;
type GitEventsStatisticsResult = object;
type Period = { start: Date; end: Date };

interface GitStatistics {
  readonly period: Period;

  result: () => GitEventsStatisticsResult;

  sortedEvents: () => GitEvent[];
}

type StatisticsAggregate = { [key: string]: GitStatistics };
const gitStatistics = (
  requestParameter: RequestParameters,
  repository: MergeEventRepository
): Promise<StatisticsAggregate> => {
  return mergeEventsStatistics(repository, requestParameter).then((statistics) =>
    Promise.resolve({ mergedEvents: statistics })
  );
};
type Unit = string | "Week" | "Month";

class Dimension {
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

type Year = number;
type PeriodIndex = number;
const gitEventsByPeriod = (gitEventStatistics: GitStatistics, eventDate: (mr: GitEvent) => Date): Dimension[] => {
  const stats: [Year, [PeriodIndex, Dimension][]][] = [];
  const duration = intervalToDuration({
    start: gitEventStatistics.period.start,
    end: gitEventStatistics.period.end,
  });
  const moreThan2Months = duration.months > 1 && duration.months + duration.days > 2;
  const unit = moreThan2Months ? "Month" : "Week";

  gitEventStatistics
    .sortedEvents()
    .filter((mr) => eventDate(mr) !== null)
    .forEach((mr) => {
      const _eventDate = eventDate(mr);
      const year = _eventDate.getFullYear();
      const dimension = Dimension.create(unit, moreThan2Months ? getMonth(_eventDate) : getWeek(_eventDate));
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
  return fillEmptyPeriodsAndSortChronologically(stats, unit, gitEventStatistics.period);
};

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

export { Dimension, Unit, StatisticsAggregate, GitStatistics, Period, GitEventsStatisticsResult, GitEvent };
export { gitStatistics, gitEventsByPeriod };
