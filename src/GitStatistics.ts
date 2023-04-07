import { MergeEventRepository, mergeEventsStatistics } from "./merge-events/MergeEvent.js";
import { RequestParameters } from "../index.js";

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

class Dimension {
  private constructor(public readonly unit: Unit, public readonly index: number, public mr: number) {}

  static create(unit: Unit, index: number) {
    return new Dimension(unit, index, 1);
  }

  increase() {
    this.mr = this.mr + 1;
  }

  static empty(unit: Unit, index: number) {
    return new Dimension(unit, index, 0);
  }
}

export { Dimension };
export { Unit };
export { gitStatistics };
export { StatisticsAggregate };
export { GitStatistics };
export { Period };
export { GitEventsStatisticsResult };
export { GitEvent };
