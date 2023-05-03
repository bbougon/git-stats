import { GitEvent, GitEventsStatisticsResult, GitStatistics, Period } from "./Statistics.js";
import { Unit } from "./GitStatistics.js";
import { eachMonthOfInterval, eachWeekOfInterval, endOfMonth, endOfWeek, getMonth, getWeek, getYear } from "date-fns";

interface CumulativeStatistic {
  readonly index: number;
  readonly period: Period;
  readonly opened: number;
  readonly closed: number;
  trend: number;
}

type CumulativeStatisticsResult = GitEventsStatisticsResult & {
  cumulativeResults: Map<Unit, CumulativeStatistic[]>;
};

class CumulativeStatistics implements GitStatistics {
  constructor(
    readonly events: GitEvent[],
    readonly period: Period,
    private readonly eventDate: (event: GitEvent) => Period
  ) {}

  result(): CumulativeStatisticsResult {
    const stats = new Map<Unit, CumulativeStatistic[]>();

    const weeksCumulativeStatistics = this.cumulativeStatistics(
      eachWeekOfInterval({
        end: this.period.end,
        start: this.period.start,
      }),
      (date, compareTo) => getWeek(date) === getWeek(compareTo) && getYear(date) === getYear(compareTo),
      (week) => endOfWeek(week),
      (date) => getWeek(date)
    );
    const monthsCumulativeStatistics = this.cumulativeStatistics(
      eachMonthOfInterval({
        end: this.period.end,
        start: this.period.start,
      }),
      (date, compareTo) => getMonth(date) === getMonth(compareTo) && getYear(date) === getYear(compareTo),
      (month) => endOfMonth(month),
      (date) => getMonth(date)
    );

    TrendCalculator.calculate(weeksCumulativeStatistics);
    TrendCalculator.calculate(monthsCumulativeStatistics);
    stats.set("Week", weeksCumulativeStatistics);
    stats.set("Month", monthsCumulativeStatistics);

    return { cumulativeResults: stats };
  }

  private cumulativeStatistics(
    periodsInInterval: Date[],
    comparingDate: (date: Date, compareTo: Date) => boolean,
    endOfPeriod: (date: Date) => Date,
    indexNumber: (date: Date) => number
  ): CumulativeStatistic[] {
    const result: CumulativeStatistic[] = [];
    periodsInInterval.forEach((date, index) => {
      const opened = this.events.filter((event) => {
        return comparingDate(date, this.eventDate(event).start);
      }).length;
      const closed = this.events.filter((event) => {
        return comparingDate(date, this.eventDate(event).end);
      }).length;
      if (result.length === 0) {
        const cumulativeStatistics = {
          index: indexNumber(date),
          period: { end: endOfPeriod(date), start: date },
          opened,
          closed,
          trend: 0,
        };
        result.push(cumulativeStatistics);
      } else {
        const cumulativeResults = result[index - 1];
        const cumulativeStatistics = {
          index: indexNumber(date),
          period: {
            end: endOfPeriod(date),
            start: date,
          },
          opened: cumulativeResults.opened + opened,
          closed: cumulativeResults.closed + closed,
          trend: 0,
        };
        result.push(cumulativeStatistics);
      }
    });
    return result;
  }
}

class TrendCalculator {
  static calculate(cumulativeStatistics: CumulativeStatistic[]) {
    const { sumOfIndexesByOpened, sumOpened, sumIndex, sumOfSquareIndex } = cumulativeStatistics.reduce(
      (accumulator, currentValue, currentIndex) => {
        return {
          sumOfIndexesByOpened: accumulator.sumOfIndexesByOpened + (currentIndex + 1) * currentValue.opened,
          sumOpened: accumulator.sumOpened + currentValue.opened,
          sumIndex: accumulator.sumIndex + (currentIndex + 1),
          sumOfSquareIndex: accumulator.sumOfSquareIndex + Math.pow(currentIndex + 1, 2),
        };
      },
      { sumOfIndexesByOpened: 0, sumOpened: 0, sumIndex: 0, sumOfSquareIndex: 0 }
    );
    const slope =
      (cumulativeStatistics.length * sumOfIndexesByOpened - sumOpened * sumIndex) /
        (cumulativeStatistics.length * sumOfSquareIndex - Math.pow(sumIndex, 2)) || 0;
    const yIntercept = parseFloat(((sumOpened - slope * sumIndex) / cumulativeStatistics.length).toFixed(1));
    cumulativeStatistics.forEach(
      (cumulativeStatistic, index) => (cumulativeStatistic.trend = slope * (index + 1) + yIntercept)
    );
  }
}

export { CumulativeStatistic, CumulativeStatisticsResult, TrendCalculator, CumulativeStatistics };
