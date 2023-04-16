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
export type Year = number;
export class StatisticFlow {
  events: Date[] = [];

  constructor(eventDate: Date | undefined, public readonly index: number) {
    if (eventDate !== undefined) {
      this.events.push(eventDate);
    }
  }

  total() {
    return this.events.length;
  }

  addEvent(eventDate: Date) {
    this.events.push(eventDate);
  }

  static month(eventDate: Date): StatisticFlow {
    return new StatisticFlow(eventDate, getMonth(eventDate));
  }

  static week(eventDate: Date): StatisticFlow {
    return new StatisticFlow(eventDate, getWeek(eventDate));
  }

  static empty(index: number) {
    return new StatisticFlow(undefined, index);
  }
}
export const gitEventsByPeriod = (
  gitEventStatistics: GitStatistics,
  eventDate: (event: GitEvent) => Date
): Map<Year, { [key: Unit]: StatisticFlow[] }[]> => {
  const stats: Map<Year, { [key: Unit]: StatisticFlow[] }[]> = new Map<Year, { [key: Unit]: StatisticFlow[] }[]>();
  gitEventStatistics
    .sortedEvents()
    .filter((event) => eventDate(event) !== null)
    .forEach((event) => {
      const _eventDate = eventDate(event);
      const year = _eventDate.getFullYear();
      const monthFlow = StatisticFlow.month(_eventDate);
      const weekFlow = StatisticFlow.week(_eventDate) as StatisticFlow;
      const yearStats = stats.get(year);

      function addFlow(flows: StatisticFlow[], flow: StatisticFlow) {
        const existingFlow = flows.filter((existingFlow: StatisticFlow) => existingFlow.index === flow.index);
        if (existingFlow.length === 0) {
          flows.push(flow);
        }
        existingFlow.forEach((flow: StatisticFlow) => {
          flow.addEvent(_eventDate);
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
