import { Writer } from "../../../index.js";
import { gitEventsByPeriod3, StatisticsAggregate } from "../../statistics/GitStatistics.js";
import { MergedEventStatistics, MergeEvent } from "../../statistics/merge-events/MergeEvent.js";

export interface GitFlowsConsole {
  log(message?: any, ...optionalParams: any[]): void;
}

export class TerminalConsole implements GitFlowsConsole {
  log(message?: any, ...optionalParams: any[]): void {
    console.log(JSON.stringify(message, null, 2), optionalParams);
  }
}

export class ConsoleWriter implements Writer {
  constructor(private readonly console: GitFlowsConsole = new TerminalConsole()) {}

  write(stats: StatisticsAggregate): void {
    const statstics = Object.values(stats).map((value) => {
      type UnitRecord = Record<string, number>;
      type PeriodUnitRecord = Record<string, UnitRecord[]>;
      type PeriodRecord = Record<string, PeriodUnitRecord[]>;
      const events = gitEventsByPeriod3(value as MergedEventStatistics, (mr: MergeEvent) => mr.mergedAt);
      const data: PeriodRecord[] = [];
      events.forEach((period, year) => {
        const periodRecord: PeriodRecord = {};
        const records: PeriodUnitRecord[] = [];
        period.forEach((statistics) => {
          const record: PeriodUnitRecord = {};
          Object.entries(statistics).forEach(([key, dimensions]) => {
            const unitRecords: UnitRecord[] = [];
            dimensions.forEach((dimension) => {
              const unitRecord: UnitRecord = {};
              unitRecord[String(dimension.index)] = dimension.total;
              unitRecords.push(unitRecord);
            });
            record[key] = unitRecords;
          });
          records.push(record);
        });
        periodRecord[String(year)] = records;
        data.push(periodRecord);
      });
      return {
        ...value.result(),
        data: data,
      };
    });
    this.console.log(statstics);
  }
}
