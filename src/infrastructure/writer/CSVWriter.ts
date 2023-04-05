import { MergedEventStatistics } from "../../merge-events/MergeEvent.js";
import { Writer } from "../../../index.js";
import fs from "fs";
import { stringify } from "csv-stringify/sync";
import moment from "moment";

export class CSVWriter implements Writer {
  private HEADER = [
    { key: "project", header: "Project" },
    { key: "id", header: "id" },
    { key: "createdAt", header: "Created At" },
    { key: "mergedAt", header: "Merged At" },
    { key: "closedAt", header: "Closed At" },
  ];
  constructor(private readonly filePath: string) {}

  write(stats: MergedEventStatistics): void {
    try {
      const reportFilePath = `${this.filePath}/report`;
      if (!fs.existsSync(reportFilePath)) {
        fs.mkdirSync(reportFilePath);
      }
      const stringifier = stringify(stats.sortedEvents(), {
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
