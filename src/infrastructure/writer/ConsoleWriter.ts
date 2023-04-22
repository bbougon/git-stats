import { Writer } from "../../../index.js";
import { mergedEventsStatisticByPeriod, StatisticsAggregate } from "../../statistics/GitStatistics.js";
import { MergeEventStatistics, MergeEvent } from "../../statistics/merge-events/MergeEvent.js";

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
      const events = mergedEventsStatisticByPeriod(value as MergeEventStatistics, (mr: MergeEvent) => ({
        end: mr.mergedAt,
        start: mr.createdAt,
      }));
      const data: PeriodRecord[] = [];
      events.forEach((period, year) => {
        const periodRecord: PeriodRecord = {};
        const records: PeriodUnitRecord[] = [];
        period.forEach((statistics) => {
          const record: PeriodUnitRecord = {};
          Object.entries(statistics).forEach(([key, flows]) => {
            const unitRecords: UnitRecord[] = [];
            flows.forEach((flow) => {
              const unitRecord: UnitRecord = {};
              unitRecord[String(flow.index)] = flow.total();
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
