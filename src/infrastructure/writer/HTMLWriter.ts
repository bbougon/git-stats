import { Writer } from "../../../index";
import { mergeRequestsByPeriod, MergeRequestStats } from "../../merge-requests/MergeRequest";
import * as fs from "fs";
import { intlFormat } from "date-fns";

class HTMLContentBuilder {
  private stats: MergeRequestStats;
  private period: { fromDate: Date; toDate: Date };

  constructor(stats: { stats: MergeRequestStats; period: { fromDate: Date; toDate: Date } }) {
    this.stats = stats.stats;
    this.period = stats.period;
  }

  build = (): string => {
    const stats = mergeRequestsByPeriod(this.stats);

    const labels: string[] = [];
    const data: number[] = [];
    for (const [key, value] of stats.entries()) {
      labels.push(key);
      data.push(value);
    }
    const htmlPage = fs.readFileSync("./templates/template.html", "utf-8");
    return htmlPage
      .replace("__LABELS__", JSON.stringify(labels))
      .replace("__DATA__", JSON.stringify(data))
      .replace(
        /__FROM__/g,
        intlFormat(this.period.fromDate, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      )
      .replace(
        /__TO__/g,
        intlFormat(this.period.toDate, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
  };
}

export class HTMLWriter implements Writer {
  private _filePath: string;

  constructor(filePath: string) {
    this._filePath = filePath;
  }

  write(stats: { stats: MergeRequestStats; period: { fromDate: Date; toDate: Date } }): void {
    try {
      fs.writeFileSync(`${this._filePath}/index.html`, new HTMLContentBuilder(stats).build());
    } catch (e) {
      console.log(e);
    }
  }
}
