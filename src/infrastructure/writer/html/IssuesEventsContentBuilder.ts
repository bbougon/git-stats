import { StatisticsAggregate, Unit } from "../../../statistics/GitStatistics.js";
import { ContentBuilder } from "./ContentBuilder.js";
import { GitEventStatisticsResult } from "../../../statistics/aggregate/Aggregate.js";
import { CumulativeStatistic } from "../../../statistics/CumulativeStatistics.js";
import { HUMAN_READABLE_MONTHS } from "../HumanReadableLabels.js";

type IssuesEventsContent = {
  cumulative: {
    months: {
      openedData: number[];
      closedData: number[];
      trendData: number[];
      labels: string[];
    };
    weeks: {
      openedData: number[];
      closedData: number[];
      trendData: number[];
      labels: string[];
    };
  };
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
    const cumulativeMonthsLabels: string[] = [];
    const cumulativeOpenedMonthsData: number[] = [];
    const cumulativeClosedMonthsData: number[] = [];
    const cumulativeTrendMonthsData: number[] = [];
    const cumulativeWeeksLabels: string[] = [];
    const cumulativeOpenedWeeksData: number[] = [];
    const cumulativeClosedWeeksData: number[] = [];
    const cumulativeTrendWeeksData: number[] = [];
    const cumulativeStatistics = this.stats.cumulativeIssues.result<Map<Unit, CumulativeStatistic[]>>().results;

    cumulativeStatistics.get("Month").forEach((cumulativeStatistics) => {
      cumulativeMonthsLabels.push(HUMAN_READABLE_MONTHS[cumulativeStatistics.index]);
      cumulativeOpenedMonthsData.push(cumulativeStatistics.opened);
      cumulativeClosedMonthsData.push(cumulativeStatistics.closed);
      cumulativeTrendMonthsData.push(cumulativeStatistics.trend);
    });

    cumulativeStatistics.get("Week").forEach((cumulativeStatistics) => {
      cumulativeWeeksLabels.push(`Week ${cumulativeStatistics.index}`);
      cumulativeOpenedWeeksData.push(cumulativeStatistics.opened);
      cumulativeClosedWeeksData.push(cumulativeStatistics.closed);
      cumulativeTrendWeeksData.push(cumulativeStatistics.trend);
    });

    return {
      cumulativeMonthsLabels,
      cumulativeOpenedMonthsData,
      cumulativeClosedMonthsData,
      cumulativeTrendMonthsData,
      cumulativeWeeksLabels,
      cumulativeOpenedWeeksData,
      cumulativeClosedWeeksData,
      cumulativeTrendWeeksData,
    };
  }
}

export { IssuesEventsContentBuilder };
