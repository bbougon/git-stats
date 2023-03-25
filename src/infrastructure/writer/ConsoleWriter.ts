import { MergeRequestStats } from "../../merge-requests/MergeRequest";
import { Writer } from "../../../index";

export class ConsoleWriter implements Writer {
  write(stats: { stats: MergeRequestStats; period: { fromDate: Date; toDate: Date } }): void {
    console.log(JSON.stringify(stats.stats.result(), null, 2));
  }
}
