import { StatisticsAggregate, Unit, Year } from "../../../statistics/GitStatistics.js";
import { MergeEventsStatisticsResult } from "../../../statistics/merge-events/MergeEventsStatistics.js";
import { GitEventsStatisticFlow } from "../../../statistics/GitEventsStatistics.js";
import { CumulativeStatistic } from "../../../statistics/CumulativeStatistics.js";
import { CumulativeEventsContent } from "./CumulativeEventsContent.js";
import { CumulativeStatisticsContentBuilder } from "./CumulativeStatisticsContentBuilder.js";
import { StatisticsEventsContent } from "./StatisticsEventsContent.js";
import { GitEventsStatisticsContentBuilder } from "./GitEventsStatisticsContentBuilder.js";
import { ContentBuilder } from "../ContentBuilder.js";

type MergeEventsContent = CumulativeEventsContent &
  StatisticsEventsContent & {
    average: Duration;
    total: {
      merged: number;
      closed: number;
      opened: number;
      all: number;
    };
  };

class MergeEventsContentBuilder implements ContentBuilder<MergeEventsContent> {
  constructor(private readonly stats: StatisticsAggregate) {}

  build(): MergeEventsContent {
    return this.mergeEvents();
  }

  private mergeEvents() {
    const {
      statisticsMonthsLabels,
      statisticsMonthsData,
      statisticsMonthsAverageTimeData,
      statisticsMonthsMedianTimeData,
      statisticsWeeksLabels,
      statisticsWeeksData,
      statisticsWeeksAverageTimeData,
      statisticsWeeksMedianTimeData,
    } = this.mergedEventsStatistics();

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

    const aggregatedStats = this.stats.mergeEvents.result<MergeEventsStatisticsResult>().results;
    return {
      events: {
        months: {
          data: statisticsMonthsData,
          labels: statisticsMonthsLabels,
          average: statisticsMonthsAverageTimeData,
          median: statisticsMonthsMedianTimeData,
        },
        weeks: {
          data: statisticsWeeksData,
          labels: statisticsWeeksLabels,
          average: statisticsWeeksAverageTimeData,
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

  private mergedEventsStatistics() {
    return new GitEventsStatisticsContentBuilder(
      this.stats.mergedEventsStatistics.result<Map<Year, { [key: Unit]: GitEventsStatisticFlow[] }[]>>().results
    ).build();
  }

  private cumulativeStatistics() {
    return new CumulativeStatisticsContentBuilder(
      this.stats.cumulativeStatistics.result<Map<Unit, CumulativeStatistic[]>>().results
    ).build();
  }
}

export { MergeEventsContentBuilder };
