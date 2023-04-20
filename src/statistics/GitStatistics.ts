import { MergeEventRepository, mergeEventsStatistics } from "./merge-events/MergeEvent.js";
import { differenceInHours, getMonth, getWeek } from "date-fns";
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

class AbstractStatisticFlow implements StatisticFlow {
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
    return new AbstractStatisticFlow(undefined, index);
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

class MonthStatisticFlow extends AbstractStatisticFlow {
  constructor(period: Period, index: number) {
    super(period, index);
  }
}

class WeekStatisticFlow extends AbstractStatisticFlow {
  constructor(period: Period, index: number) {
    super(period, index);
  }
}

export const gitEventsByPeriod = (
  gitEventStatistics: GitStatistics,
  eventDate: (event: GitEvent) => Period
): Map<Year, { [p: Unit]: AbstractStatisticFlow[] }[]> => {
  const stats: Map<Year, { [key: Unit]: AbstractStatisticFlow[] }[]> = new Map<
    Year,
    { [key: Unit]: AbstractStatisticFlow[] }[]
  >();
  gitEventStatistics
    .sortedEvents()
    .filter((event) => eventDate(event).end !== null)
    .forEach((event) => {
      const period = eventDate(event);
      const year = period.end.getFullYear();
      const monthFlow = AbstractStatisticFlow.month(period);
      const weekFlow = AbstractStatisticFlow.week(period) as AbstractStatisticFlow;
      const yearStats = stats.get(year);

      function addFlow(flows: AbstractStatisticFlow[], flow: AbstractStatisticFlow) {
        const existingFlow = flows.filter((existingFlow: AbstractStatisticFlow) => existingFlow.index === flow.index);
        if (existingFlow.length === 0) {
          flows.push(flow);
        }
        existingFlow.forEach((flow: AbstractStatisticFlow) => {
          flow.addEvent(period);
        });
      }

      if (yearStats === undefined) {
        stats.set(year, [{ Month: [monthFlow] }, { Week: [weekFlow] }] as { [key: Unit]: AbstractStatisticFlow[] }[]);
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
  stats: Map<Year, { [key: Unit]: AbstractStatisticFlow[] }[]>,
  period: Period
): Map<Year, { [key: Unit]: AbstractStatisticFlow[] }[]> => {
  const completeStatistics = stats;

  function fillEmptyPeriodsInInterval(_stat: { [p: Unit]: AbstractStatisticFlow[] }, year: Year) {
    Object.entries(_stat).forEach(([unit, statisticFlows]) => {
      const periodIndexes = PeriodIndexesBuilder.for(year, period, unit);
      while (periodIndexes.firstPeriodIndex < periodIndexes.lastPeriodIndex) {
        const currentPeriodIndex = periodIndexes.firstPeriodIndex;
        if (statisticFlows.find((currentStat) => currentStat.index === currentPeriodIndex) === undefined) {
          statisticFlows.push(AbstractStatisticFlow.empty(currentPeriodIndex));
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
