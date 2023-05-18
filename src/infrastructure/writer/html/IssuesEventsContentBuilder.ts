import { StatisticsAggregate, Unit, Year } from "../../../statistics/GitStatistics.js";
import { GitEventStatisticsResult } from "../../../statistics/aggregate/Aggregate.js";
import { CumulativeStatistic } from "../../../statistics/CumulativeStatistics.js";
import { CumulativeEventsContent } from "./CumulativeEventsContent.js";
import { CumulativeStatisticsContentBuilder } from "./CumulativeStatisticsContentBuilder.js";
import { GitEventsStatisticsContentBuilder } from "./GitEventsStatisticsContentBuilder.js";
import { GitEventsStatisticFlow } from "../../../statistics/GitEventsStatistics.js";
import { StatisticsEventsContent } from "./StatisticsEventsContent.js";
import { ContentBuilder } from "../ContentBuilder.js";

type IssuesEventsContent = CumulativeEventsContent &
  StatisticsEventsContent & {
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

    const {
      statisticsMonthsLabels,
      statisticsMonthsData,
      statisticsMonthsAverageTimeData,
      statisticsMonthsMedianTimeData,
      statisticsWeeksLabels,
      statisticsWeeksData,
      statisticsWeeksAverageTimeData,
      statisticsWeeksMedianTimeData,
    } = new GitEventsStatisticsContentBuilder(
      this.stats.issuesStatistics.result<Map<Year, { [key: Unit]: GitEventsStatisticFlow[] }[]>>().results
    ).build();

    return {
      events: {
        months: {
          average: statisticsMonthsAverageTimeData,
          data: statisticsMonthsData,
          labels: statisticsMonthsLabels,
          median: statisticsMonthsMedianTimeData,
        },
        weeks: {
          average: statisticsWeeksAverageTimeData,
          data: statisticsWeeksData,
          labels: statisticsWeeksLabels,
          median: statisticsWeeksMedianTimeData,
        },
      },
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
