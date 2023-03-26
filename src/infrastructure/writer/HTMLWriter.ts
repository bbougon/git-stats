import { Writer } from "../../../index.js";
import { Dimension, mergeRequestsByPeriod, MergeRequestStats } from "../../merge-requests/MergeRequest.js";
import * as fs from "fs";
import { intlFormat } from "date-fns";
import { openBrowser } from "./OpenBrowser.js";

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
  "december",
];

class HTMLContentBuilder {
  constructor(private readonly stats: MergeRequestStats) {}

  build = (): string => {
    const stats = mergeRequestsByPeriod(this.stats);
    const labels: string[] = [];
    const data: number[] = [];
    for (const stat of stats) {
      labels.push(this.buildLabel(stat));
      data.push(stat.mr);
    }
    const htmlPage = fs.readFileSync("./templates/template.html", "utf-8");
    const aggregatedStats = this.stats.result();
    return htmlPage
      .replace("__MERGE_REQUESTS_LINE_CHART_LABELS__", JSON.stringify(labels))
      .replace("__MERGE_REQUESTS_LINE_CHART_DATA__", JSON.stringify(data))
      .replace(
        /__FROM__/g,
        intlFormat(this.stats.period.start, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      )
      .replace(
        /__TO__/g,
        intlFormat(this.stats.period.end, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      )
      .replace("__AVERAGE_DAYS__", String(aggregatedStats.average.days))
      .replace("__AVERAGE_HOURS__", String(aggregatedStats.average.hours))
      .replace("__TOTAL_MERGED__", String(aggregatedStats.total.merged))
      .replace("__TOTAL_OPENED__", String(aggregatedStats.total.opened))
      .replace("__TOTAL_CLOSED__", String(aggregatedStats.total.closed))
      .replace("__TOTAL_OVERALL__", String(aggregatedStats.total.all))
      .replace("__MERGE_REQUESTS_DOUGHNUT_CHART_LABELS__", JSON.stringify(["Merged", "Opened", "Closed", "All"]))
      .replace(
        "__MERGE_REQUESTS_DOUGHNUT_CHART_DATA__",
        JSON.stringify([
          aggregatedStats.total.merged,
          aggregatedStats.total.opened,
          aggregatedStats.total.closed,
          aggregatedStats.total.all,
        ])
      );
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
