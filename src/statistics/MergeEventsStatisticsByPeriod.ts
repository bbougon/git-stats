import { GitEvent, GitEventsStatisticsResult, GitStatistics, Period } from "./Statistics.js";
import { MergedEventsStatisticFlow } from "./MergedEventsStatistic.js";
import { Unit, Year } from "./GitStatistics.js";
import { getMonth, getWeek } from "date-fns";

type MergeEventsStatisticsByPeriodResults = GitEventsStatisticsResult & {
  mergeEventsResults: Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>;
};

class MergeEventsStatisticsByPeriod implements GitStatistics {
  constructor(
    readonly events: GitEvent[],
    readonly period: Period,
    private readonly eventDate: (event: GitEvent) => Period
  ) {}

  result(): MergeEventsStatisticsByPeriodResults {
    const stats: Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]> = new Map<
      Year,
      { [key: Unit]: MergedEventsStatisticFlow[] }[]
    >();
    this.events
      .filter((event) => this.eventDate(event).end !== null)
      .forEach((event) => {
        const period = this.eventDate(event);
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
    return { mergeEventsResults: fillEmptyPeriodsAndSortChronologically(stats, this.period) };
  }
}

type PeriodIndexes = {
  firstPeriodIndex: number;
  lastPeriodIndex: number;
};

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

export { MergeEventsStatisticsByPeriodResults, MergeEventsStatisticsByPeriod };
