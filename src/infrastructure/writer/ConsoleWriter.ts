import { MergeRequestStats } from "../../merge-requests/MergeRequest";
import { Writer } from "../../../index";

export class ConsoleWriter implements Writer {
  write(stats: MergeRequestStats): any {
    console.log(JSON.stringify(stats.result(), null, 2));
    return;
  }
}
