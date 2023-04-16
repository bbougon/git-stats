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
export class StatisticFlow {
  public readonly events: Period[] = [];

  constructor(period: Period | undefined, public readonly index: number) {
    if (period !== undefined) {
      this.events.push(period);
    }
  }

  total() {
    return this.events.length;
  }

  addEvent(period: Period) {
    this.events.push(period);
  }

  static month(period: Period): StatisticFlow {
    return new StatisticFlow(period, getMonth(period.end));
  }

  static week(period: Period): StatisticFlow {
    return new StatisticFlow(period, getWeek(period.end));
  }

  static empty(index: number) {
    return new StatisticFlow(undefined, index);
  }

  average(): Duration {
    const hoursSpent = this.events.reduce(
      (accumulator, currentValue) => accumulator + differenceInHours(currentValue.end, currentValue.start),
      0
    );
    const duration = moment.duration(hoursSpent / this.events.length, "hours");
    return {
      months: parseInt(duration.months().toFixed()),
      days: parseInt(duration.days().toFixed()),
      hours: parseInt(duration.hours().toFixed()),
      minutes: parseInt(duration.minutes().toFixed()),
      seconds: parseInt(duration.seconds().toFixed()),
    };
  }

  median(): Duration {
    const hoursSeries = this.events.map((period) => ({ hours: differenceInHours(period.end, period.start) }));
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
}
export const gitEventsByPeriod = (
  gitEventStatistics: GitStatistics,
  eventDate: (event: GitEvent) => Period
): Map<Year, { [p: Unit]: StatisticFlow[] }[]> => {
  const stats: Map<Year, { [key: Unit]: StatisticFlow[] }[]> = new Map<Year, { [key: Unit]: StatisticFlow[] }[]>();
  gitEventStatistics
    .sortedEvents()
    .filter((event) => eventDate(event).end !== null)
    .forEach((event) => {
      const period = eventDate(event);
      const year = period.end.getFullYear();
      const monthFlow = StatisticFlow.month(period);
      const weekFlow = StatisticFlow.week(period) as StatisticFlow;
      const yearStats = stats.get(year);

      function addFlow(flows: StatisticFlow[], flow: StatisticFlow) {
        const existingFlow = flows.filter((existingFlow: StatisticFlow) => existingFlow.index === flow.index);
        if (existingFlow.length === 0) {
          flows.push(flow);
        }
        existingFlow.forEach((flow: StatisticFlow) => {
          flow.addEvent(period);
        });
      }

      if (yearStats === undefined) {
        stats.set(year, [{ Month: [monthFlow] }, { Week: [weekFlow] }] as { [key: Unit]: StatisticFlow[] }[]);
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
  stats: Map<Year, { [key: Unit]: StatisticFlow[] }[]>,
  period: Period
): Map<Year, { [key: Unit]: StatisticFlow[] }[]> => {
  const completeStatistics = stats;

  function fillEmptyPeriodsInInterval(_stat: { [p: Unit]: StatisticFlow[] }, year: Year) {
    Object.entries(_stat).forEach(([unit, statisticFlows]) => {
      const periodIndexes = PeriodIndexesBuilder.for(year, period, unit);
      while (periodIndexes.firstPeriodIndex < periodIndexes.lastPeriodIndex) {
        const currentPeriodIndex = periodIndexes.firstPeriodIndex;
        if (statisticFlows.find((currentStat) => currentStat.index === currentPeriodIndex) === undefined) {
          statisticFlows.push(StatisticFlow.empty(currentPeriodIndex));
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
