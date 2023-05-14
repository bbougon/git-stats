import { MergeEvent } from "./merge-events/MergeEvent.js";
import { RequestParameters } from "../../index.js";
import { CumulativeStatistics } from "./CumulativeStatistics.js";
import { GitStatistics } from "./Statistics.js";
import { GitEventsStatistics } from "./GitEventsStatistics.js";
import { Repositories } from "./Repositories.js";
import { IssueEventStatistics } from "./issues/Issues.js";
import { MergeEventStatistics } from "./merge-events/MergeEventsStatistics.js";

type StatisticsAggregate = { [key: string]: GitStatistics };

const gitStatistics = (requestParameter: RequestParameters): Promise<StatisticsAggregate> => {
  const period = { end: requestParameter.toDate, start: requestParameter.fromDate };
  const mergeEvents = Repositories.mergeEvent()
    .getEventsForPeriod(requestParameter)
    .then((mergeEvents) => {
      const mergeEventStatistics = new MergeEventStatistics(mergeEvents, period);
      const mergeEventsStatisticsByPeriod = new GitEventsStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt,
        start: mr.start,
      }));
      const cumulativeStatistics = new CumulativeStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt || mr.closedAt,
        start: mr.start,
      }));
      return {
        mergeEvents: mergeEventStatistics,
        cumulativeStatistics: cumulativeStatistics,
        mergedEventsStatistics: mergeEventsStatisticsByPeriod,
      };
    });

  const issueEvents = Repositories.issueEvent()
    .getEventsForPeriod(requestParameter)
    .then((issueEvents) => {
      const issueEventStatistics = new IssueEventStatistics(issueEvents, period);
      const cumulativeIssues = new CumulativeStatistics(issueEvents, period, (event) => ({
        end: event.closedAt,
        start: event.start,
      }));
      return Promise.resolve({
        issues: issueEventStatistics,
        cumulativeIssues,
      });
    });
  return Promise.all([mergeEvents, issueEvents]).then((values) => {
    let result: StatisticsAggregate;
    values.forEach((promise) => (result = { ...result, ...promise }));
    return result;
  });
};
type Unit = string | "Week" | "Month";
export type Year = number;
export { Unit, StatisticsAggregate };
export { gitStatistics };
