import { Writer } from "../../../index.js";
import { StatisticsAggregate } from "../../merge-events/GitStatistics.js";

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
