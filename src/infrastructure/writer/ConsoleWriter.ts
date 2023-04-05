import { MergedEventStatistics } from "../../merge-events/MergeEvent.js";
import { Writer } from "../../../index.js";

export class ConsoleWriter implements Writer {
  write(stats: MergedEventStatistics): void {
    console.log(JSON.stringify(stats.result(), null, 2));
  }
}
