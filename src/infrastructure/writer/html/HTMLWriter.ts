import * as fs from "fs";
import { intlFormat } from "date-fns";
import { __dirname } from "../FilePathConstant.js";
import * as pug from "pug";
import * as path from "path";
import { StatisticsAggregate } from "../../../statistics/GitStatistics.js";
import { Writer } from "../../../../index.js";
import { progressBar } from "../../progress-bar/ProgressBar.js";
import { Type } from "../../progress-bar/Type.js";
import { openBrowser } from "../OpenBrowser.js";
import { MergeEventsContentBuilder } from "./MergeEventsContentBuilder.js";
import { IssuesEventsContentBuilder } from "./IssuesEventsContentBuilder.js";

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
    const mergeEvents = new MergeEventsContentBuilder(this.stats).build();
    const issuesEvents = new IssuesEventsContentBuilder(this.stats).build();
    const start = humanizeDate(this.stats.mergeEvents.period.start);
    const end = humanizeDate(this.stats.mergeEvents.period.end);
    const templateFilePath = path.resolve(__dirname, "../../../templates/template.pug");
    const fn = pug.compileFile(templateFilePath, { pretty: true });
    return fn({
      stringify,
      period: { start, end },
      stats: {
        merge: { ...mergeEvents },
        issues: { ...issuesEvents },
      },
    });
  };
}

export class HTMLWriter implements Writer {
  private readonly _filePath: string;

  constructor(filePath: string) {
    this._filePath = filePath;
  }

  @progressBar(Type.Generate_HTML)
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
