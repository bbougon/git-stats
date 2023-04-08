import { Writer } from "../../../index.js";
import fs from "fs";
import { stringify } from "csv-stringify/sync";
import moment from "moment";
import { StatisticsAggregate } from "../../statistics/GitStatistics.js";

export class CSVWriter implements Writer {
  private HEADER = [
    { key: "eventType", header: "Event" },
    { key: "project", header: "Project" },
    { key: "id", header: "id" },
    { key: "createdAt", header: "Created At" },
    { key: "mergedAt", header: "Merged At" },
    { key: "closedAt", header: "Closed At" },
  ];
  constructor(private readonly filePath: string) {}

  write(stats: StatisticsAggregate): void {
    try {
      const reportFilePath = `${this.filePath}/report`;
      if (!fs.existsSync(reportFilePath)) {
        fs.mkdirSync(reportFilePath);
      }
      const input = Object.entries(stats).flatMap(([key, value]) =>
        value.sortedEvents().map((event) => ({ eventType: key, ...event }))
      );
      const stringifier = stringify(input, {
        header: true,
        columns: this.HEADER,
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
