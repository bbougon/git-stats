import { MergeEventRepository, mergeEventsStatistics } from "./merge-events/MergeEvent.js";
import {
  differenceInHours,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  getMonth,
  getWeek,
  getYear,
} from "date-fns";
import { RequestParameters } from "../../index.js";
import moment from "moment/moment.js";
import Duration from "./Duration.js";

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
export type Year = number;

interface StatisticFlow {
  events: Period[];
  readonly index: number;

  total(): number;

  addEvent(period: Period): void;

  average(): Duration;

  median(): Duration;
}

class MergedEventsStatisticFlow implements StatisticFlow {
  readonly events: Period[] = [];

  constructor(period: Period | undefined, readonly index: number) {
    if (period !== undefined) {
      this.events.push(period);
    }
  }

  total(): number {
    return this.events.length;
  }

  addEvent(period: Period) {
    this.events.push(period);
  }

  static month(period: Period): StatisticFlow {
    return new MonthStatisticFlow(period, getMonth(period.end));
  }

  static week(period: Period): StatisticFlow {
    return new WeekStatisticFlow(period, getWeek(period.end));
  }

  static empty(index: number) {
    return new MergedEventsStatisticFlow(undefined, index);
  }

  average(): Duration {
    const hoursSpent = this.events.reduce(
      (accumulator, currentValue) => accumulator + differenceInHours(currentValue.end, currentValue.start),
      0
    );
    if (this.events.length > 0) {
      const duration = moment.duration(hoursSpent / this.events.length, "hours");
      return {
        months: parseInt(duration.months().toFixed()),
        days: parseInt(duration.days().toFixed()),
        hours: parseInt(duration.hours().toFixed()),
        minutes: parseInt(duration.minutes().toFixed()),
        seconds: parseInt(duration.seconds().toFixed()),
      };
    }
    return { days: 0, hours: 0, minutes: 0, months: 0, seconds: 0 };
  }

  median(): Duration {
    const hoursSeries = this.events.map((period) => ({ hours: differenceInHours(period.end, period.start) }));
    if (hoursSeries.length > 0) {
      hoursSeries.sort((current, next) => (current.hours > next.hours ? 1 : -1));
      const seriesIndex = (hoursSeries.length + 1) / 2 - 1;
      const isHourSeriesEvent = (hoursSeries.length + 1) % 2 === 0;
      let duration = {} as moment.Duration;
      if (isHourSeriesEvent) {
        duration = moment.duration(hoursSeries[seriesIndex].hours, "hours");
      } else {
        const hours = (hoursSeries[Math.floor(seriesIndex)].hours + hoursSeries[Math.ceil(seriesIndex)].hours) / 2;
        duration = moment.duration(hours, "hours");
      }
      return {
        months: parseInt(duration.months().toFixed()),
        days: parseInt(duration.days().toFixed()),
        hours: parseInt(duration.hours().toFixed()),
        minutes: parseInt(duration.minutes().toFixed()),
        seconds: parseInt(duration.seconds().toFixed()),
      };
    }
    return { days: 0, hours: 0, minutes: 0, months: 0, seconds: 0 };
  }
}

class MonthStatisticFlow extends MergedEventsStatisticFlow {
  constructor(period: Period, index: number) {
    super(period, index);
  }
}

class WeekStatisticFlow extends MergedEventsStatisticFlow {
  constructor(period: Period, index: number) {
    super(period, index);
  }
}

export const mergedEventsStatisticByPeriod = (
  gitEventStatistics: GitStatistics,
  eventDate: (event: GitEvent) => Period
): Map<Year, { [p: Unit]: StatisticFlow[] }[]> => {
  const stats: Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]> = new Map<
    Year,
    { [key: Unit]: MergedEventsStatisticFlow[] }[]
  >();
  gitEventStatistics
    .sortedEvents()
    .filter((event) => eventDate(event).end !== null)
    .forEach((event) => {
      const period = eventDate(event);
      const year = period.end.getFullYear();
      const monthFlow = MergedEventsStatisticFlow.month(period);
      const weekFlow = MergedEventsStatisticFlow.week(period) as MergedEventsStatisticFlow;
      const yearStats = stats.get(year);

      function addFlow(flows: MergedEventsStatisticFlow[], flow: MergedEventsStatisticFlow) {
        const existingFlow = flows.filter(
          (existingFlow: MergedEventsStatisticFlow) => existingFlow.index === flow.index
        );
        if (existingFlow.length === 0) {
          flows.push(flow);
        }
        existingFlow.forEach((flow: MergedEventsStatisticFlow) => {
          flow.addEvent(period);
        });
      }

      if (yearStats === undefined) {
        stats.set(year, [{ Month: [monthFlow] }, { Week: [weekFlow] }] as {
          [key: Unit]: MergedEventsStatisticFlow[];
        }[]);
      } else {
        yearStats.forEach((period) => {
          Object.entries(period).forEach(([key, flows]) => {
            if (key === "Month") {
              addFlow(flows, monthFlow);
            }
            if (key === "Week") {
              addFlow(flows, weekFlow);
            }
          });
        });
      }
    });
  return fillEmptyPeriodsAndSortChronologically(stats, gitEventStatistics.period);
};

interface CumulativeStatistics {
  readonly period: Period;
  readonly opened: number;
  readonly closed: number;
  readonly trend: number;
}

class CumulativeMergeEvent implements CumulativeStatistics {
  constructor(
    public readonly period: Period,
    public readonly opened: number,
    public readonly closed: number,
    public readonly trend: number
  ) {}

  static month(period: Period, opened: number, closed: number, trend: number): CumulativeStatistics {
    return new CumulativeMergeEvent(period, opened, closed, trend);
  }

  static week(period: Period, opened: number, closed: number, trend: number): CumulativeStatistics {
    return new CumulativeMergeEvent(period, opened, closed, trend);
  }
}

export const cumulativeMergeEventsStatisticByPeriod = (
  gitEventStatistics: GitStatistics,
  eventDate: (event: GitEvent) => Period
): Map<Unit, CumulativeStatistics[]> => {
  const stats = new Map<Unit, CumulativeStatistics[]>();

  function cumulativeStatistics(
    periodsInInterval: Date[],
    periodKey: Unit,
    comparingDate: (date: Date, compareTo: Date) => boolean,
    endOfPeriod: (date: Date) => Date
  ) {
    const initialTrend = gitEventStatistics.sortedEvents().length / periodsInInterval.length;
    periodsInInterval.forEach((date, index) => {
      const opened = gitEventStatistics.sortedEvents().filter((event) => {
        return comparingDate(date, eventDate(event).start);
      }).length;
      const closed = gitEventStatistics.sortedEvents().filter((event) => {
        return comparingDate(date, eventDate(event).end);
      }).length;
      const trend = initialTrend * (index + 1);
      const period = stats.get(periodKey);
      if (period === undefined) {
        const cumulativeStatistics = new CumulativeMergeEvent(
          {
            end: endOfPeriod(date),
            start: date,
          },
          opened,
          closed,
          trend
        );
        stats.set(periodKey, [cumulativeStatistics]);
      } else {
        const cumulativeResults = period[index - 1];
        const cumulativeStatistics = new CumulativeMergeEvent(
          {
            end: endOfPeriod(date),
            start: date,
          },
          cumulativeResults.opened + opened,
          cumulativeResults.closed + closed,
          trend
        );
        period.push(cumulativeStatistics);
      }
    });
  }

  cumulativeStatistics(
    eachWeekOfInterval({ end: gitEventStatistics.period.end, start: gitEventStatistics.period.start }),
    "Week",
    (date, compareTo) => getWeek(date) === getWeek(compareTo) && getYear(date) === getYear(compareTo),
    (week) => endOfWeek(week)
  );

  cumulativeStatistics(
    eachMonthOfInterval({
      end: gitEventStatistics.period.end,
      start: gitEventStatistics.period.start,
    }),
    "Month",
    (date, compareTo) => getMonth(date) === getMonth(compareTo) && getYear(date) === getYear(compareTo),
    (month) => endOfMonth(month)
  );
  return stats;
};

type PeriodIndexes = {
  firstPeriodIndex: number;
  lastPeriodIndex: number;
};

abstract class PeriodIndexesBuilder {
  static periodIndexes = new Map<Unit, PeriodIndexesBuilder>([
    [
      "Month",
      new (class extends PeriodIndexesBuilder {
        protected build(currentYear: Year, period: Period): PeriodIndexes {
          const periodIndex = this.initialize(period, getMonth);
          if (currentYear !== period.end.getFullYear()) {
            periodIndex.lastPeriodIndex = 12;
          }
          if (currentYear !== period.start.getFullYear()) {
            periodIndex.firstPeriodIndex = 0;
          }
          return periodIndex;
        }
      })(),
    ],
    [
      "Week",
      new (class extends PeriodIndexesBuilder {
        protected build(currentYear: Year, period: Period): PeriodIndexes {
          const periodIndex = this.initialize(period, getWeek);
          if (currentYear !== period.end.getFullYear()) {
            periodIndex.lastPeriodIndex = getWeek(new Date(currentYear, 11, 31)) + 1;
          }
          if (currentYear !== period.start.getFullYear()) {
            periodIndex.firstPeriodIndex = 1;
          }
          return periodIndex;
        }
      })(),
    ],
  ]);

  static for(currentYear: Year, period: Period, unit: Unit): PeriodIndexes {
    return this.periodIndexes.get(unit).build(currentYear, period);
  }

  protected abstract build(year: Year, period: Period): PeriodIndexes;
  protected initialize(period: Period, getDate: (date: Date) => number): PeriodIndexes {
    return { firstPeriodIndex: getDate(period.start), lastPeriodIndex: getDate(period.end) + 1 };
  }
}

const fillEmptyPeriodsAndSortChronologically = (
  stats: Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>,
  period: Period
): Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]> => {
  const completeStatistics = stats;

  function fillEmptyPeriodsInInterval(_stat: { [p: Unit]: MergedEventsStatisticFlow[] }, year: Year) {
    Object.entries(_stat).forEach(([unit, statisticFlows]) => {
      const periodIndexes = PeriodIndexesBuilder.for(year, period, unit);
      while (periodIndexes.firstPeriodIndex < periodIndexes.lastPeriodIndex) {
        const currentPeriodIndex = periodIndexes.firstPeriodIndex;
        if (statisticFlows.find((currentStat) => currentStat.index === currentPeriodIndex) === undefined) {
          statisticFlows.push(MergedEventsStatisticFlow.empty(currentPeriodIndex));
        }
        periodIndexes.firstPeriodIndex++;
      }
      statisticFlows.sort((current, next) => (current.index > next.index ? 1 : -1));
    });
  }

  completeStatistics.forEach((flows, year) => {
    flows.forEach((period) => {
      fillEmptyPeriodsInInterval(period, year);
    });
  });
  return completeStatistics;
};
export { Unit, StatisticsAggregate, GitStatistics, Period, GitEventsStatisticsResult, GitEvent };
export { gitStatistics };
