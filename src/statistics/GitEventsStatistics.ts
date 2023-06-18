import { GitEvent, GitEventsStatisticsResult, GitStatistics, Period, StatisticFlow } from "./Statistics.js";
import { Unit, Year } from "./GitStatistics.js";
import { differenceInHours, getMonth, getWeek, isBefore } from "date-fns";
import Duration from "./Duration.js";
import moment from "moment/moment.js";

export class GitEventsStatisticFlow implements StatisticFlow {
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
    return new GitEventsStatisticFlow(period, getMonth(period.end));
  }

  static week(period: Period): StatisticFlow {
    return new GitEventsStatisticFlow(period, getWeek(period.end));
  }

  static empty(index: number) {
    return new GitEventsStatisticFlow(undefined, index);
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
      const isHourSeriesEven = (hoursSeries.length + 1) % 2 === 0;
      let duration = {} as moment.Duration;
      if (isHourSeriesEven) {
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
class GitEventsStatistics implements GitStatistics {
  constructor(
    readonly events: GitEvent[],
    readonly period: Period,
    private readonly eventDate: (event: GitEvent) => Period
  ) {}

  result<T = Map<Year, { [key: Unit]: GitEventsStatisticFlow[] }[]>>(): GitEventsStatisticsResult<T> {
    const stats: Map<Year, { [key: Unit]: GitEventsStatisticFlow[] }[]> = new Map<
      Year,
      { [key: Unit]: GitEventsStatisticFlow[] }[]
    >();
    this.events
      .filter((event) => {
        const eventEndDate = this.eventDate(event).end;
        return eventEndDate !== null && isBefore(eventEndDate, this.period.end);
      })
      .forEach((event) => {
        const period = this.eventDate(event);
        const year = period.end.getFullYear();
        const monthFlow = GitEventsStatisticFlow.month(period);
        const weekFlow = GitEventsStatisticFlow.week(period) as GitEventsStatisticFlow;
        const yearStats = stats.get(year);

        function addFlow(flows: GitEventsStatisticFlow[], flow: GitEventsStatisticFlow) {
          const existingFlow = flows.filter(
            (existingFlow: GitEventsStatisticFlow) => existingFlow.index === flow.index
          );
          if (existingFlow.length === 0) {
            flows.push(flow);
          }
          existingFlow.forEach((flow: GitEventsStatisticFlow) => {
            flow.addEvent(period);
          });
        }

        if (yearStats === undefined) {
          stats.set(year, [{ Month: [monthFlow] }, { Week: [weekFlow] }] as {
            [key: Unit]: GitEventsStatisticFlow[];
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
    return { results: fillEmptyPeriodsAndSortChronologically(stats, this.period) } as GitEventsStatisticsResult<T>;
  }
}

type PeriodIndexes = {
  firstPeriodIndex: number;
  lastPeriodIndex: number;
};

const fillEmptyPeriodsAndSortChronologically = (
  stats: Map<Year, { [key: Unit]: GitEventsStatisticFlow[] }[]>,
  period: Period
): Map<Year, { [key: Unit]: GitEventsStatisticFlow[] }[]> => {
  const completeStatistics = stats;

  function fillEmptyPeriodsInInterval(_stat: { [p: Unit]: GitEventsStatisticFlow[] }, year: Year) {
    Object.entries(_stat).forEach(([unit, statisticFlows]) => {
      const periodIndexes = PeriodIndexesBuilder.for(year, period, unit);
      while (periodIndexes.firstPeriodIndex < periodIndexes.lastPeriodIndex) {
        const currentPeriodIndex = periodIndexes.firstPeriodIndex;
        if (statisticFlows.find((currentStat) => currentStat.index === currentPeriodIndex) === undefined) {
          statisticFlows.push(GitEventsStatisticFlow.empty(currentPeriodIndex));
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

export { GitEventsStatistics };
