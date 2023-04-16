import { Writer } from "../../../index.js";
import * as fs from "fs";
import { intlFormat } from "date-fns";
import { openBrowser } from "./OpenBrowser.js";
import * as pug from "pug";
import * as path from "path";
import { __dirname } from "./FilePathConstant.js";
import { gitEventsByPeriod3, StatisticsAggregate } from "../../statistics/GitStatistics.js";
import { MergedEventStatistics, MergeEvent } from "../../statistics/merge-events/MergeEvent.js";
import { progressBar } from "../progress-bar/ProgressBar.js";
import { Title } from "../progress-bar/Title.js";
import { HUMAN_READABLE_MONTHS } from "./HumanReadableLabels.js";

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
    const stats = gitEventsByPeriod3(this.stats.mergedEvents as MergedEventStatistics, (mr: MergeEvent) => mr.mergedAt);
    const monthsLabels: string[] = [];
    const monthsData: number[] = [];
    const weeksLabels: string[] = [];
    const weeksData: number[] = [];
    stats.forEach((stat) => {
      stat.forEach((period) => {
        Object.entries(period).forEach(([unit, dimensions]) => {
          if (unit === "Month") {
            dimensions.forEach((dimension) => {
              monthsLabels.push(HUMAN_READABLE_MONTHS[dimension.index]);
              monthsData.push(dimension.total);
            });
          }
          if (unit === "Week") {
            dimensions.forEach((dimension) => {
              weeksLabels.push(`Week ${dimension.index}`);
              weeksData.push(dimension.total);
            });
          }
        });
      });
    });

    const aggregatedStats = this.stats.mergedEvents.result();
    const start = humanizeDate(this.stats.mergedEvents.period.start);
    const end = humanizeDate(this.stats.mergedEvents.period.end);
    const templateFilePath = path.resolve(__dirname, "../../../templates/template.pug");
    const fn = pug.compileFile(templateFilePath, { pretty: true });
    return fn({
      stringify,
      period: { start, end },
      stats: {
        mr: { months: { data: monthsData, labels: monthsLabels }, weeks: { data: weeksData, labels: weeksLabels } },
        ...aggregatedStats,
      },
    });
  };
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
