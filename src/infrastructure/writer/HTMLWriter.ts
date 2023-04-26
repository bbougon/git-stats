import { Writer } from "../../../index.js";
import * as fs from "fs";
import { intlFormat } from "date-fns";
import { openBrowser } from "./OpenBrowser.js";
import * as pug from "pug";
import * as path from "path";
import { __dirname } from "./FilePathConstant.js";
import { mergedEventsStatisticByPeriod, StatisticsAggregate } from "../../statistics/GitStatistics.js";
import { MergeEventStatistics, MergeEvent } from "../../statistics/merge-events/MergeEvent.js";
import { progressBar } from "../progress-bar/ProgressBar.js";
import { Title } from "../progress-bar/Title.js";
import { HUMAN_READABLE_MONTHS } from "./HumanReadableLabels.js";
import moment from "moment/moment.js";
import Duration from "../../statistics/Duration.js";
import { CumulativeStatistics } from "../../statistics/CumulativeStatistics.js";

class HTMLContentBuilder {
  constructor(private readonly stats: StatisticsAggregate) {}

  build = (): string => {
    const humanizeDate = (date: Date): string => {
      return intlFormat(date, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };
    const stringify = (obj: string): string => {
      return JSON.stringify(obj)
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029")
        .replace(/</g, "\\u003C")
        .replace(/>/g, "\\u003E")
        .replace(/\//g, "\\u002F");
    };
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

    const aggregatedStats = this.stats.mergedEvents.result();
    const start = humanizeDate(this.stats.mergedEvents.period.start);
    const end = humanizeDate(this.stats.mergedEvents.period.end);
    const templateFilePath = path.resolve(__dirname, "../../../templates/template.pug");
    const fn = pug.compileFile(templateFilePath, { pretty: true });
    return fn({
      stringify,
      period: { start, end },
      stats: {
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
      },
    });
  };

  private mergedEventsStatistics() {
    const mergedEventsStatistics = mergedEventsStatisticByPeriod(
      this.stats.mergedEvents as MergeEventStatistics,
      (mr: MergeEvent) => ({
        end: mr.mergedAt,
        start: mr.createdAt,
      })
    );
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
    const cumulativeMonthsLabels: string[] = [];
    const cumulativeOpenedMonthsData: number[] = [];
    const cumulativeClosedMonthsData: number[] = [];
    const cumulativeTrendMonthsData: number[] = [];
    const cumulativeWeeksLabels: string[] = [];
    const cumulativeOpenedWeeksData: number[] = [];
    const cumulativeClosedWeeksData: number[] = [];
    const cumulativeTrendWeeksData: number[] = [];
    const cumulativeStatistics = (this.stats.cumulativeStatistics as CumulativeStatistics).result().cumulativeResults;

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

export class HTMLWriter implements Writer {
  private _filePath: string;

  constructor(filePath: string) {
    this._filePath = filePath;
  }

  @progressBar(Title.Generate_HTML)
  write(stats: StatisticsAggregate): void {
    try {
      const reportFilePath = `${this._filePath}/report`;
      if (!fs.existsSync(reportFilePath)) {
        fs.mkdirSync(reportFilePath);
      }
      fs.writeFileSync(`${reportFilePath}/index.html`, new HTMLContentBuilder(stats).build());
      const cssFilePath = path.resolve(__dirname, "../../../style.css");
      fs.copyFileSync(cssFilePath, `${reportFilePath}/style.css`);
      openBrowser(`${reportFilePath}/index.html`);
    } catch (e) {
      console.log(e);
    }
  }
}
