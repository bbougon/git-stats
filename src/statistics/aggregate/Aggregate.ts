import { GitEvent, GitEventsStatisticsResult, GitStatistics, Period } from "../Statistics.js";
import { differenceInSeconds } from "date-fns";
import moment from "moment";

type GitEventStatisticsResult = {
  average: Duration;
  total: {
    closed: number;
    opened: number;
    all: number;
  };
};

abstract class AbstractGitEventStatistics implements GitStatistics {
  constructor(readonly events: GitEvent[], public readonly period: Period) {}

  result<T = GitEventStatisticsResult>(): GitEventsStatisticsResult<T> {
    const openedIssues = this.openedEvents;
    const closedIssues = this.closedEvents;
    const duration = this.duration();
    return {
      results: {
        average: {
          months: parseInt(duration.months().toFixed()),
          days: parseInt(duration.days().toFixed()),
          hours: parseInt(duration.hours().toFixed()),
          minutes: parseInt(duration.minutes().toFixed()),
          seconds: parseInt(duration.seconds().toFixed()),
        },
        total: {
          closed: closedIssues.length,
          opened: openedIssues.length,
          all: this.events.length,
        },
      },
    } as GitEventsStatisticsResult<T>;
  }

  private duration() {
    const secondsSpent = this.timeSpent((dateLeft: Date, dateRight: Date) => differenceInSeconds(dateLeft, dateRight));
    return moment.duration(secondsSpent.duration / secondsSpent.length, "seconds");
  }

  protected abstract get openedEvents(): GitEvent[];

  protected abstract get closedEvents(): GitEvent[];

  protected abstract timeSpent(difference: (dateLeft: Date, dateRight: Date) => number): {
    duration: number;
    length: number;
  };
}

export { AbstractGitEventStatistics };
export { GitEventStatisticsResult };
