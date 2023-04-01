import { Writer } from "../../../index.js";
import { Dimension, mergeRequestsByPeriod, MergeRequestStats } from "../../merge-requests/MergeRequest.js";
import * as fs from "fs";
import { intlFormat } from "date-fns";
import { openBrowser } from "./OpenBrowser.js";
import * as pug from "pug";

const HUMAN_READABLE_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

class HTMLContentBuilder {
  constructor(private readonly stats: MergeRequestStats) {}

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
    const stats = mergeRequestsByPeriod(this.stats);
    const labels: string[] = [];
    const data: number[] = [];
    for (const stat of stats) {
      labels.push(this.buildLabel(stat));
      data.push(stat.mr);
    }

    const aggregatedStats = this.stats.result();
    const start = humanizeDate(this.stats.period.start);
    const end = humanizeDate(this.stats.period.end);
    const fn = pug.compileFile("./templates/template.pug", { pretty: true });
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

  write(stats: MergeRequestStats): void {
    try {
      fs.writeFileSync(`${this._filePath}/index.html`, new HTMLContentBuilder(stats).build());
      openBrowser(`${this._filePath}/index.html`);
    } catch (e) {
      console.log(e);
    }
  }
}
