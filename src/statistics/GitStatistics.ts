import { MergeEvent, MergeEventRepository, mergeEventsStatistics } from "./merge-events/MergeEvent.js";
import { RequestParameters } from "../../index.js";
import { CumulativeStatistics } from "./CumulativeStatistics.js";
import { GitEvent, GitStatistics, Period, StatisticFlow } from "./Statistics.js";
import { MergeEventsStatisticsByPeriod } from "./MergeEventsStatisticsByPeriod.js";

type StatisticsAggregate = { [key: string]: GitStatistics };

const gitStatistics = (
  requestParameter: RequestParameters,
  repository: MergeEventRepository
): Promise<StatisticsAggregate> => {
  return mergeEventsStatistics(repository, requestParameter).then((statistics) =>
    Promise.resolve({
      mergeEvents: statistics,
      cumulativeStatistics: cumulativeMergeEventsStatisticByPeriod(statistics, (mr: MergeEvent) => ({
        end: mr.mergedAt || mr.closedAt,
        start: mr.createdAt,
      })),
      mergedEventsStatistics: mergedEventsStatisticByPeriod(statistics, (mr: MergeEvent) => ({
        end: mr.mergedAt,
        start: mr.createdAt,
      })),
    })
  );
};
type Unit = string | "Week" | "Month";
export type Year = number;
const mergedEventsStatisticByPeriod = (
  gitEventStatistics: GitStatistics,
  eventDate: (event: GitEvent) => Period
): MergeEventsStatisticsByPeriod => {
  return new MergeEventsStatisticsByPeriod(gitEventStatistics.sortedEvents(), gitEventStatistics.period, eventDate);
};

const cumulativeMergeEventsStatisticByPeriod = (
  gitEventStatistics: GitStatistics,
  eventDate: (event: GitEvent) => Period
): CumulativeStatistics => {
  return new CumulativeStatistics(gitEventStatistics.sortedEvents(), gitEventStatistics.period, eventDate);
};
export { Unit, StatisticsAggregate };
export { gitStatistics };
