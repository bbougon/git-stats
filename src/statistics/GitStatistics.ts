import { MergeEventRepository, mergeEventsStatistics } from "./merge-events/MergeEvent.js";
import { getMonth, getWeek } from "date-fns";
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

  static month(eventDate: Date): Dimension {
    return new Dimension("Month", getMonth(eventDate), 0);
  }

  static week(eventDate: Date) {
    return new Dimension("Week", getWeek(eventDate), 0);
  }
}

export type Year = number;
export class Dimension2 {
  events: Date[] = [];

  constructor(eventDate: Date | undefined, public readonly index: number, public total: number) {
    if (eventDate !== undefined) {
      this.events.push(eventDate);
    }
  }

  increase() {
    this.total = this.total + 1;
  }

  addEvent(eventDate: Date) {
    this.events.push(eventDate);
  }

  static month(eventDate: Date): Dimension2 {
    return new Dimension2(eventDate, getMonth(eventDate), 1);
  }

  static week(eventDate: Date): Dimension2 {
    return new Dimension2(eventDate, getWeek(eventDate), 1);
  }

  static empty(index: number) {
    return new Dimension2(undefined, index, 0);
  }
}
export const gitEventsByPeriod3 = (
  gitEventStatistics: GitStatistics,
  eventDate: (event: GitEvent) => Date
): Map<Year, { [key: Unit]: Dimension2[] }[]> => {
  const stats: Map<Year, { [key: Unit]: Dimension2[] }[]> = new Map<Year, { [key: Unit]: Dimension2[] }[]>();
  gitEventStatistics
    .sortedEvents()
    .filter((event) => eventDate(event) !== null)
    .forEach((event) => {
      const _eventDate = eventDate(event);
      const year = _eventDate.getFullYear();
      const monthDimension = Dimension2.month(_eventDate);
      const weekDimension = Dimension2.week(_eventDate) as Dimension2;
      const yearStats = stats.get(year);
      if (yearStats === undefined) {
        stats.set(year, [{ Month: [monthDimension] }, { Week: [weekDimension] }] as { [key: Unit]: Dimension2[] }[]);
      } else {
        yearStats.forEach((period) => {
          Object.entries(period).forEach(([key, dimensions]) => {
            if (key === "Month") {
              const filter = dimensions.filter((dimension: Dimension2) => dimension.index === monthDimension.index);
              if (filter.length === 0) {
                dimensions.push(monthDimension);
              }
              filter.forEach((dimension: Dimension2) => {
                dimension.addEvent(_eventDate);
                dimension.increase();
              });
            }
            if (key === "Week") {
              const filter = dimensions.filter((dimension: Dimension2) => dimension.index === weekDimension.index);
              if (filter.length === 0) {
                dimensions.push(weekDimension);
              }
              filter.forEach((dimension: Dimension2) => {
                dimension.addEvent(_eventDate);
                dimension.increase();
              });
            }
          });
        });
      }
    });
  return fillEmptyPeriodsAndSortChronologically2(stats, gitEventStatistics.period);
};

const fillEmptyPeriodsAndSortChronologically2 = (
  stats: Map<Year, { [key: Unit]: Dimension2[] }[]>,
  period: Period
): Map<Year, { [key: Unit]: Dimension2[] }[]> => {
  const completeStatistics = stats;

  function fillEmptyPeriodsInInterval(_stat: { [p: Unit]: Dimension2[] }, year: Year) {
    Object.entries(_stat).forEach(([unit, dimensions]) => {
      let firstPeriodIndex = 0;
      let lastPeriodIndex = 0;
      if (unit === "Month") {
        firstPeriodIndex = getMonth(period.start);
        lastPeriodIndex = getMonth(period.end) + 1;
        if (year !== period.end.getFullYear()) {
          lastPeriodIndex = 12;
        }
        if (year !== period.start.getFullYear()) {
          firstPeriodIndex = 0;
        }
      }
      if (unit === "Week") {
        firstPeriodIndex = getWeek(period.start);
        lastPeriodIndex = getWeek(period.end) + 1;
        if (year !== period.end.getFullYear()) {
          lastPeriodIndex = getWeek(new Date(year, 11, 31));
        }
        if (year !== period.start.getFullYear()) {
          firstPeriodIndex = 1;
        }
      }
      while (firstPeriodIndex < lastPeriodIndex) {
        const currentPeriodIndex = firstPeriodIndex;
        if (dimensions.find((currentStat) => currentStat.index === currentPeriodIndex) === undefined) {
          dimensions.push(Dimension2.empty(currentPeriodIndex));
        }
        firstPeriodIndex++;
      }
      dimensions.sort((current, next) => (current.index > next.index ? 1 : -1));
    });
  }

  completeStatistics.forEach((dimensions, year) => {
    dimensions.forEach((period) => {
      fillEmptyPeriodsInInterval(period, year);
    });
  });
  return completeStatistics;
};
export { Dimension, Unit, StatisticsAggregate, GitStatistics, Period, GitEventsStatisticsResult, GitEvent };
export { gitStatistics };
