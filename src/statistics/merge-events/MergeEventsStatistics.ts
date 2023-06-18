import { AbstractGitEventStatistics, GitEventStatisticsResult } from "../aggregate/Aggregate.js";
import { MergeEvent } from "./MergeEvent.js";
import { GitEvent, GitEventsStatisticsResult, Period } from "../Statistics.js";
import { isAfter, isBefore } from "date-fns";

type MergeEventsStatisticsResult = {
  average: Duration;
  total: {
    merged: number;
    closed: number;
    opened: number;
    all: number;
  };
};

class MergeEventStatistics extends AbstractGitEventStatistics {
  constructor(readonly events: MergeEvent[], public readonly period: Period) {
    super(events, period);
  }

  result<T = MergeEventsStatisticsResult>(): GitEventsStatisticsResult<T> {
    const result = super.result<GitEventStatisticsResult>();
    return {
      results: {
        average: { ...result.results.average },
        total: { merged: this.mergedMergeRequests.length, ...result.results.total },
      },
    } as GitEventsStatisticsResult<T>;
  }

  private get mergedMergeRequests() {
    return this.events.filter((mr) => mr.mergedAt !== null && isBefore(mr.mergedAt, this.period.end));
  }

  protected get closedEvents(): GitEvent[] {
    return this.events.filter((mr) => mr.closedAt !== null && isBefore(mr.closedAt, this.period.end));
  }

  protected get openedEvents(): GitEvent[] {
    return this.events.filter((mr) => {
      const isMergeOrCloseDateAfterPeriodEnds =
        isAfter(mr.mergedAt, this.period.end) || isAfter(mr.closedAt, this.period.end);
      return (mr.mergedAt === null && mr.closedAt === null) || isMergeOrCloseDateAfterPeriodEnds;
    });
  }

  protected timeSpent(difference: (dateLeft: Date, dateRight: Date) => number): { duration: number; length: number } {
    const events = this.mergedMergeRequests;
    const timeSpent = events.reduce((accumulator, currentValue) => {
      return accumulator + difference(currentValue.mergedAt, currentValue.start);
    }, 0);
    return { duration: timeSpent, length: events.length };
  }
}

export { MergeEventStatistics, MergeEventsStatisticsResult };
