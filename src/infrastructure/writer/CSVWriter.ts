import { Writer } from "../../../index.js";
import fs from "fs";
import { stringify } from "csv-stringify/sync";
import moment from "moment";
import { StatisticsAggregate } from "../../statistics/GitStatistics.js";
import { progressBar } from "../progress-bar/ProgressBar.js";
import { Type } from "../progress-bar/Type.js";

export class CSVWriter implements Writer {
  private static HEADER = [
    { key: "eventType", header: "Event" },
    { key: "project", header: "Project" },
    { key: "id", header: "id" },
    { key: "start", header: "Created At" },
    { key: "mergedAt", header: "Merged At" },
    { key: "closedAt", header: "Closed At" },
  ];

  private static EVENTS_TYPE = ["issues", "mergeEvents"];

  constructor(private readonly filePath: string) {}

  @progressBar(Type.Generate_CSV)
  write(stats: StatisticsAggregate): void {
    try {
      const reportFilePath = `${this.filePath}/report`;
      if (!fs.existsSync(reportFilePath)) {
        fs.mkdirSync(reportFilePath);
      }
      const input = Object.entries(stats)
        .filter(([key, _value]) => CSVWriter.EVENTS_TYPE.includes(key))
        .flatMap(([key, value]) => value.events.map((event) => ({ eventType: key, ...event })));
      const stringifier = stringify(input, {
        header: true,
        columns: CSVWriter.HEADER,
        delimiter: ";",
        cast: {
          date: function (value: Date) {
            return { value: moment(value).toISOString(), quote: false };
          },
        },
      });
      fs.writeFileSync(`${reportFilePath}/report.csv`, stringifier);
    } catch (e) {
      console.log(e);
    }
  }
}
