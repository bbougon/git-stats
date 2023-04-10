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
  constructor(public readonly unit: Unit, public readonly index: number, public total: number) {}

  static create(unit: Unit, index: number) {
    return new Dimension(unit, index, 1);
  }

  increase() {
    this.total = this.total + 1;
  }

  static empty(unit: Unit, index: number) {
    return new Dimension(unit, index, 0);
  }
}

type Year = number;
type PeriodIndex = number;

const gitEventsByPeriod = (
  gitEventStatistics: GitStatistics,
  eventDate: (event: GitEvent) => Date
): [Year, [PeriodIndex, Dimension][]][] => {
  const stats: [Year, [PeriodIndex, Dimension][]][] = [];
  const duration = intervalToDuration({
    start: gitEventStatistics.period.start,
    end: gitEventStatistics.period.end,
  });
  const moreThan2Months = duration.months > 1 && duration.months + duration.days > 2;
  const unit = moreThan2Months ? "Month" : "Week";

  gitEventStatistics
    .sortedEvents()
    .filter((event) => eventDate(event) !== null)
    .forEach((event) => {
      const _eventDate = eventDate(event);
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

const fillEmptyPeriodsAndSortChronologically = (
  stats: [Year, [PeriodIndex, Dimension][]][],
  unit: string,
  period: Period
): [Year, [PeriodIndex, Dimension][]][] => {
  const completeStatistics = stats;
  const periodEndIndex = unit === "Week" ? getWeek(period.end) : getMonth(period.end);

  function fillEmptyPeriodsInInterval(stat: [number, [PeriodIndex, Dimension][]], lastPeriodIndex: number) {
    let firstPeriodIndex = unit === "Week" ? getWeek(period.start) : getMonth(period.start);
    while (firstPeriodIndex < lastPeriodIndex) {
      const currentPeriodIndex = firstPeriodIndex;
      if (stat[1].find((currentStat) => currentStat[0] === currentPeriodIndex) === undefined) {
        stat[1].push([currentPeriodIndex, Dimension.empty(unit, currentPeriodIndex)]);
      }
      firstPeriodIndex++;
    }
  }

  function fillPeriodTail(stat: [number, [PeriodIndex, Dimension][]], lastPeriodIndex: number) {
    let postPeriodIndex = lastPeriodIndex + 1;
    while (postPeriodIndex <= periodEndIndex) {
      stat[1].push([postPeriodIndex, Dimension.empty(unit, postPeriodIndex)]);
      postPeriodIndex++;
    }
  }

  completeStatistics.forEach((stat) => {
    const lastPeriodIndex = stat[1].slice(-1)[0][1].index;
    fillEmptyPeriodsInInterval(stat, lastPeriodIndex);
    fillPeriodTail(stat, lastPeriodIndex);
    stat[1].sort((stat, nextStat) => (stat[0] > nextStat[0] ? 1 : -1));
  });
  return completeStatistics;
};

export { Dimension, Unit, StatisticsAggregate, GitStatistics, Period, GitEventsStatisticsResult, GitEvent };
export { gitStatistics, gitEventsByPeriod };
