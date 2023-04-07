import { Writer } from "../../../index.js";
import { MergedEventStatistics, mergeEventsByPeriod } from "../../merge-events/MergeEvent.js";
import * as fs from "fs";
import { intlFormat } from "date-fns";
import { openBrowser } from "./OpenBrowser.js";
import * as pug from "pug";
import * as path from "path";
import { __dirname } from "./FilePathConstant.js";
import { Dimension, StatisticsAggregate } from "../../GitStatistics.js";

const HUMAN_READABLE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
    const stats = mergeEventsByPeriod(this.stats.mergedEvents as MergedEventStatistics);
    const labels: string[] = [];
    const data: number[] = [];
    for (const stat of stats) {
      labels.push(this.buildLabel(stat));
      data.push(stat.mr);
    }

    const aggregatedStats = this.stats.mergedEvents.result();
    const start = humanizeDate(this.stats.mergedEvents.period.start);
    const end = humanizeDate(this.stats.mergedEvents.period.end);
    const templateFilePath = path.resolve(__dirname, "../../../templates/template.pug");
    const fn = pug.compileFile(templateFilePath, { pretty: true });
    return fn({
      stringify,
      period: { start, end },
      stats: { mr: { data, labels }, ...aggregatedStats },
    });
  };

  private buildLabel(stat: Dimension) {
    if (stat.unit === "Month") {
      return HUMAN_READABLE_MONTHS[stat.index];
    }
    return `${stat.unit} ${stat.index}`;
  }
}

export class HTMLWriter implements Writer {
  private _filePath: string;

  constructor(filePath: string) {
    this._filePath = filePath;
  }

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
