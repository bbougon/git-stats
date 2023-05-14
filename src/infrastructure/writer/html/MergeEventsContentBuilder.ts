import { StatisticsAggregate, Unit, Year } from "../../../statistics/GitStatistics.js";
import { MergeEventsStatisticsResult } from "../../../statistics/merge-events/MergeEventsStatistics.js";
import { GitEventsStatisticFlow } from "../../../statistics/GitEventsStatistics.js";
import moment from "moment";
import { HUMAN_READABLE_MONTHS } from "../HumanReadableLabels.js";
import { CumulativeStatistic } from "../../../statistics/CumulativeStatistics.js";
import { ContentBuilder } from "./ContentBuilder.js";
import { CumulativeEventsContent } from "./CumulativeEventsContent.js";
import { CumulativeStatisticsContentBuilder } from "./CumulativeStatisticsContentBuilder.js";

type MergeEventsContent = CumulativeEventsContent & {
  mr: {
    months: {
      data: number[];
      labels: string[];
      average: number[];
      median: number[];
    };
    weeks: {
      data: number[];
      labels: string[];
      average: number[];
      median: number[];
    };
  };
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
      mergedEventMonthsLabels,
      mergedEventsMonthsData,
      mergedEventsMonthsAverageTimeData,
      mergedEventsMonthsMedianTimeData,
      mergedEventsWeeksLabels,
      mergedEventsWeeksData,
      mergedEventsWeeksAverageData,
      mergedEventsWeeksMedianData,
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
      mr: {
        months: {
          data: mergedEventsMonthsData,
          labels: mergedEventMonthsLabels,
          average: mergedEventsMonthsAverageTimeData,
          median: mergedEventsMonthsMedianTimeData,
        },
        weeks: {
          data: mergedEventsWeeksData,
          labels: mergedEventsWeeksLabels,
          average: mergedEventsWeeksAverageData,
          median: mergedEventsWeeksMedianData,
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
    const mergedEventsStatistics =
      this.stats.mergedEventsStatistics.result<Map<Year, { [key: Unit]: GitEventsStatisticFlow[] }[]>>().results;
    const mergedEventMonthsLabels: string[] = [];
    const mergedEventsMonthsData: number[] = [];
    const mergedEventsMonthsAverageTimeData: number[] = [];
    const mergedEventsMonthsMedianTimeData: number[] = [];
    const mergedEventsWeeksLabels: string[] = [];
    const mergedEventsWeeksData: number[] = [];
    const mergedEventsWeeksAverageData: number[] = [];
    const mergedEventsWeeksMedianData: number[] = [];

    function durationAsHours(duration: Duration) {
      return moment
        .duration(duration.months, "months")
        .add(duration.days, "days")
        .add(duration.hours, "hours")
        .add(duration.minutes, "minutes")
        .add(duration.seconds, "seconds")
        .asHours();
    }

    mergedEventsStatistics.forEach((stat) => {
      stat.forEach((period) => {
        Object.entries(period).forEach(([unit, flows]) => {
          if (unit === "Month") {
            flows.forEach((flow) => {
              mergedEventMonthsLabels.push(HUMAN_READABLE_MONTHS[flow.index]);
              mergedEventsMonthsData.push(flow.total());
              mergedEventsMonthsAverageTimeData.push(durationAsHours(flow.average()));
              mergedEventsMonthsMedianTimeData.push(durationAsHours(flow.median()));
            });
          }
          if (unit === "Week") {
            flows.forEach((flow) => {
              mergedEventsWeeksLabels.push(`Week ${flow.index}`);
              mergedEventsWeeksData.push(flow.total());
              mergedEventsWeeksAverageData.push(durationAsHours(flow.average()));
              mergedEventsWeeksMedianData.push(durationAsHours(flow.median()));
            });
          }
        });
      });
    });
    return {
      mergedEventMonthsLabels,
      mergedEventsMonthsData,
      mergedEventsMonthsAverageTimeData,
      mergedEventsMonthsMedianTimeData,
      mergedEventsWeeksLabels,
      mergedEventsWeeksData,
      mergedEventsWeeksAverageData,
      mergedEventsWeeksMedianData,
    };
  }

  private cumulativeStatistics() {
    return new CumulativeStatisticsContentBuilder(
      this.stats.cumulativeStatistics.result<Map<Unit, CumulativeStatistic[]>>().results
    ).build();
  }
}

export { MergeEventsContentBuilder };
