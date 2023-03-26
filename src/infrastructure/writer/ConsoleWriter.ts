import { MergeRequestStats } from "../../merge-requests/MergeRequest.js";
import { Writer } from "../../../index.js";

export class ConsoleWriter implements Writer {
  write(stats: MergeRequestStats): void {
    console.log(JSON.stringify(stats.result(), null, 2));
  }
}
