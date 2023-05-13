import { Unit } from "../../../statistics/GitStatistics.js";
import { CumulativeStatistic } from "../../../statistics/CumulativeStatistics.js";
import { HUMAN_READABLE_MONTHS } from "../HumanReadableLabels.js";

type CumulativeStatisticsContent = {
  cumulativeMonthsLabels: string[];
  cumulativeOpenedMonthsData: number[];
  cumulativeClosedMonthsData: number[];
  cumulativeTrendMonthsData: number[];
  cumulativeWeeksLabels: string[];
  cumulativeOpenedWeeksData: number[];
  cumulativeClosedWeeksData: number[];
  cumulativeTrendWeeksData: number[];
};

export class CumulativeStatisticsContentBuilder {
  constructor(private readonly statistics: Map<Unit, CumulativeStatistic[]>) {}

  build(): CumulativeStatisticsContent {
    const cumulativeMonthsLabels: string[] = [];
    const cumulativeOpenedMonthsData: number[] = [];
    const cumulativeClosedMonthsData: number[] = [];
    const cumulativeTrendMonthsData: number[] = [];
    const cumulativeWeeksLabels: string[] = [];
    const cumulativeOpenedWeeksData: number[] = [];
    const cumulativeClosedWeeksData: number[] = [];
    const cumulativeTrendWeeksData: number[] = [];

    this.statistics.get("Month").forEach((cumulativeStatistics) => {
      cumulativeMonthsLabels.push(HUMAN_READABLE_MONTHS[cumulativeStatistics.index]);
      cumulativeOpenedMonthsData.push(cumulativeStatistics.opened);
      cumulativeClosedMonthsData.push(cumulativeStatistics.closed);
      cumulativeTrendMonthsData.push(cumulativeStatistics.trend);
    });

    this.statistics.get("Week").forEach((cumulativeStatistics) => {
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
