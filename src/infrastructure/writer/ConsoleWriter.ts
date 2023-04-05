import { StatisticsAggregate } from "../../merge-events/MergeEvent.js";
import { Writer } from "../../../index.js";

export class ConsoleWriter implements Writer {
  write(stats: StatisticsAggregate): void {
    console.log(
      JSON.stringify(
        Object.values(stats).map((value) => value.result),
        null,
        2
      )
    );
  }
}
