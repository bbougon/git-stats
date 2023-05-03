import Duration from "./Duration.js";

type GitEvent = {
  start: Date;
};
type GitEventsStatisticsResult = object;
type Period = { start: Date; end: Date };

interface GitStatistics {
  readonly period: Period;

  result: () => GitEventsStatisticsResult;

  sortedEvents: () => GitEvent[];
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
