import Duration from "./Duration.js";

type GitEvent = {
  start: Date;
  closedAt: Date | null;
};
type GitEventsStatisticsResult<T> = { results: T };
type Period = { start: Date; end: Date };

interface GitStatistics {
  readonly period: Period;
  readonly events: GitEvent[];

  result: <T>() => GitEventsStatisticsResult<T>;
}

interface StatisticFlow {
  events: Period[];
  readonly index: number;

  total(): number;

  addEvent(period: Period): void;

  average(): Duration;

  median(): Duration;
}

export { GitStatistics, StatisticFlow };
export { Period };
export { GitEventsStatisticsResult };
export { GitEvent };
