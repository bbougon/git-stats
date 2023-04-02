import { GitStatistics } from "../../merge-events/MergeEvent.js";
import { Writer } from "../../../index.js";

export class ConsoleWriter implements Writer {
  write(stats: GitStatistics): void {
    console.log(JSON.stringify(stats.result(), null, 2));
  }
}
