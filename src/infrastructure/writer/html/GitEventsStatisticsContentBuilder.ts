import { Unit, Year } from "../../../statistics/GitStatistics.js";
import { GitEventsStatisticFlow } from "../../../statistics/GitEventsStatistics.js";
import moment from "moment/moment.js";
import { HUMAN_READABLE_MONTHS } from "../HumanReadableLabels.js";

type GitEventsStatisticsContent = {
  statisticsMonthsLabels: string[];
  statisticsMonthsData: number[];
  statisticsMonthsAverageTimeData: number[];
  statisticsMonthsMedianTimeData: number[];
  statisticsWeeksLabels: string[];
  statisticsWeeksData: number[];
  statisticsWeeksAverageTimeData: number[];
  statisticsWeeksMedianTimeData: number[];
};

export class GitEventsStatisticsContentBuilder {
  constructor(private readonly statistics: Map<Year, { [key: Unit]: GitEventsStatisticFlow[] }[]>) {}

  build(): GitEventsStatisticsContent {
    const statistics = this.statistics;
    const statisticsMonthsLabels: string[] = [];
    const statisticsMonthsData: number[] = [];
    const statisticsMonthsAverageTimeData: number[] = [];
    const statisticsMonthsMedianTimeData: number[] = [];
    const statisticsWeeksLabels: string[] = [];
    const statisticsWeeksData: number[] = [];
    const statisticsWeeksAverageTimeData: number[] = [];
    const statisticsWeeksMedianTimeData: number[] = [];

    function durationAsHours(duration: Duration) {
      return moment
        .duration(duration.months, "months")
        .add(duration.days, "days")
        .add(duration.hours, "hours")
        .add(duration.minutes, "minutes")
        .add(duration.seconds, "seconds")
        .asHours();
    }

    statistics.forEach((stat) => {
      stat.forEach((period) => {
        Object.entries(period).forEach(([unit, flows]) => {
          if (unit === "Month") {
            flows.forEach((flow) => {
              statisticsMonthsLabels.push(HUMAN_READABLE_MONTHS[flow.index]);
              statisticsMonthsData.push(flow.total());
              statisticsMonthsAverageTimeData.push(durationAsHours(flow.average()));
              statisticsMonthsMedianTimeData.push(durationAsHours(flow.median()));
            });
          }
          if (unit === "Week") {
            flows.forEach((flow) => {
              statisticsWeeksLabels.push(`Week ${flow.index}`);
              statisticsWeeksData.push(flow.total());
              statisticsWeeksAverageTimeData.push(durationAsHours(flow.average()));
              statisticsWeeksMedianTimeData.push(durationAsHours(flow.median()));
            });
          }
        });
      });
    });
    return {
      statisticsMonthsLabels,
      statisticsMonthsData,
      statisticsMonthsAverageTimeData,
      statisticsMonthsMedianTimeData,
      statisticsWeeksLabels,
      statisticsWeeksData,
      statisticsWeeksAverageTimeData,
      statisticsWeeksMedianTimeData,
    };
  }
}
