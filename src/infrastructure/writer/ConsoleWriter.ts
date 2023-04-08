import { Writer } from "../../../index.js";
import { gitEventsByPeriod, StatisticsAggregate } from "../../statistics/GitStatistics.js";
import { MergedEventStatistics, MergeEvent } from "../../statistics/merge-events/MergeEvent.js";
import { buildLabel } from "./HumanReadableLabels.js";

export class ConsoleWriter implements Writer {
  write(stats: StatisticsAggregate): void {
    console.log(
      JSON.stringify(
        Object.values(stats).map((value) => {
          const data = gitEventsByPeriod(value as MergedEventStatistics, (mr: MergeEvent) => mr.mergedAt).map(
            (stat) => {
              return [
                stat[0],
                stat[1].map((period): Record<string, number> => {
                  type StatRecord = Record<string, number>;
                  const record: StatRecord = {};
                  record[buildLabel(period[1])] = period[1].total;
                  return record;
                }),
              ];
            }
          );
          return {
            ...value.result(),
            data: data,
          };
        }),
        null,
        2
      )
    );
  }
}
