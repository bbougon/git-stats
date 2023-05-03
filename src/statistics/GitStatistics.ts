import { MergeEvent, MergeEventRepository } from "./merge-events/MergeEvent.js";
import { RequestParameters } from "../../index.js";
import { CumulativeStatistics } from "./CumulativeStatistics.js";
import { GitStatistics } from "./Statistics.js";
import { MergedEventsStatistics } from "./MergedEventsStatistics.js";
import { MergeEventStatistics } from "./MergeEventsStatistics.js";

type StatisticsAggregate = { [key: string]: GitStatistics };

const gitStatistics = (
  requestParameter: RequestParameters,
  repository: MergeEventRepository
): Promise<StatisticsAggregate> => {
  return repository.getMergeEventsForPeriod(requestParameter).then((mergeEvents) => {
    const period = { end: requestParameter.toDate, start: requestParameter.fromDate };
    const mergeEventStatistics = new MergeEventStatistics(mergeEvents, period);
    const mergeEventsStatisticsByPeriod = new MergedEventsStatistics(mergeEvents, period, (mr: MergeEvent) => ({
      end: mr.mergedAt,
      start: mr.start,
    }));
    const cumulativeStatistics = new CumulativeStatistics(mergeEvents, period, (mr: MergeEvent) => ({
      end: mr.mergedAt || mr.closedAt,
      start: mr.start,
    }));
    return Promise.resolve({
      mergeEvents: mergeEventStatistics,
      cumulativeStatistics: cumulativeStatistics,
      mergedEventsStatistics: mergeEventsStatisticsByPeriod,
    });
  });
};
type Unit = string | "Week" | "Month";
export type Year = number;
export { Unit, StatisticsAggregate };
export { gitStatistics };
