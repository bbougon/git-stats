import { StatisticsAggregate } from "../../../statistics/GitStatistics.js";
import { ContentBuilder } from "./ContentBuilder.js";
import { GitEventStatisticsResult } from "../../../statistics/aggregate/Aggregate.js";

type IssuesEventsContent = {
  average: Duration;
  total: {
    closed: number;
    opened: number;
    all: number;
  };
};

class IssuesEventsContentBuilder implements ContentBuilder<IssuesEventsContent> {
  constructor(private readonly stats: StatisticsAggregate) {}

  build(): IssuesEventsContent {
    const aggregatedStats = this.stats.issues.result<GitEventStatisticsResult>().results;
    return { ...aggregatedStats };
  }
}

export { IssuesEventsContentBuilder };
