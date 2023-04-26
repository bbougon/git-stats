import { MergeEvent, MergeEventRepository, mergeEventsStatistics } from "./merge-events/MergeEvent.js";
import { getMonth, getWeek } from "date-fns";
import { RequestParameters } from "../../index.js";
import { MergedEventsStatisticFlow } from "./MergedEventsStatistic.js";
import { CumulativeStatistics } from "./CumulativeStatistics.js";
import { GitEvent, GitStatistics, Period, StatisticFlow } from "./Statistics.js";

type StatisticsAggregate = { [key: string]: GitStatistics };

const gitStatistics = (
  requestParameter: RequestParameters,
  repository: MergeEventRepository
): Promise<StatisticsAggregate> => {
  return mergeEventsStatistics(repository, requestParameter).then((statistics) =>
    Promise.resolve({
      mergedEvents: statistics,
      cumulativeStatistics: cumulativeMergeEventsStatisticByPeriod(statistics, (mr: MergeEvent) => ({
        end: mr.mergedAt || mr.closedAt,
        start: mr.createdAt,
      })),
    })
  );
};
type Unit = string | "Week" | "Month";
export type Year = number;

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

const cumulativeMergeEventsStatisticByPeriod = (
  gitEventStatistics: GitStatistics,
  eventDate: (event: GitEvent) => Period
): CumulativeStatistics => {
  return new CumulativeStatistics(gitEventStatistics.sortedEvents(), gitEventStatistics.period, eventDate);
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
export { Unit, StatisticsAggregate };
export { gitStatistics };
