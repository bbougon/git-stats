import { StatisticsAggregate, Unit } from "../../../statistics/GitStatistics.js";
import { ContentBuilder } from "./ContentBuilder.js";
import { GitEventStatisticsResult } from "../../../statistics/aggregate/Aggregate.js";
import { CumulativeStatistic } from "../../../statistics/CumulativeStatistics.js";
import { CumulativeEventsContent } from "./CumulativeEventsContent.js";
import { CumulativeStatisticsContentBuilder } from "./CumulativeStatisticsContentBuilder.js";

type IssuesEventsContent = CumulativeEventsContent & {
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

    const {
      cumulativeMonthsLabels,
      cumulativeOpenedMonthsData,
      cumulativeClosedMonthsData,
      cumulativeTrendMonthsData,
      cumulativeWeeksLabels,
      cumulativeOpenedWeeksData,
      cumulativeClosedWeeksData,
      cumulativeTrendWeeksData,
    } = this.cumulativeStatistics();

    return {
      cumulative: {
        months: {
          openedData: cumulativeOpenedMonthsData,
          closedData: cumulativeClosedMonthsData,
          trendData: cumulativeTrendMonthsData,
          labels: cumulativeMonthsLabels,
        },
        weeks: {
          openedData: cumulativeOpenedWeeksData,
          closedData: cumulativeClosedWeeksData,
          trendData: cumulativeTrendWeeksData,
          labels: cumulativeWeeksLabels,
        },
      },
      ...aggregatedStats,
    };
  }

  private cumulativeStatistics() {
    return new CumulativeStatisticsContentBuilder(
      this.stats.cumulativeIssues.result<Map<Unit, CumulativeStatistic[]>>().results
    ).build();
  }
}

export { IssuesEventsContentBuilder };
