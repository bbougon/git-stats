import { Writer } from "../../../index.js";
import { StatisticsAggregate, Unit, Year } from "../../statistics/GitStatistics.js";
import { GitStatistics } from "../../statistics/Statistics.js";
import { MergedEventsStatisticFlow } from "../../statistics/MergedEventsStatistics.js";
import { CumulativeStatistic } from "../../statistics/CumulativeStatistics.js";
import { MergeEventsStatisticsResult } from "../../statistics/merge-events/MergeEventsStatistics.js";

export interface GitFlowsConsole {
  log(message?: any, ...optionalParams: any[]): void;
}

export class TerminalConsole implements GitFlowsConsole {
  log(message?: any, ...optionalParams: any[]): void {
    console.log(JSON.stringify(message, null, 2), optionalParams);
  }
}

interface StatisticBuilder<T> {
  build(statistics: GitStatistics): T;
}

type UnitRecord = Record<string, number>;
type PeriodUnitRecord = Record<string, UnitRecord[]>;
type PeriodRecord = Record<string, PeriodUnitRecord[]>;

class MergedEventsStatisticByPeriodBuilder implements StatisticBuilder<{ mergedEventsStatistics: PeriodRecord[] }> {
  build(statistics: GitStatistics): { mergedEventsStatistics: PeriodRecord[] } {
    const events = statistics.result<Map<Year, { [key: Unit]: MergedEventsStatisticFlow[] }[]>>().results;
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
    return { mergedEventsStatistics: data };
  }
}

type AggregateStatistics = {
  average: {
    days: number;
    hours: number;
    minutes: number;
    months: number;
    seconds: number;
  };
  total: {
    all: number;
    closed: number;
    merged: number;
    opened: number;
  };
};
class MergeEventsStatisticBuilder implements StatisticBuilder<{ mergedEvents: AggregateStatistics }> {
  build(statistics: GitStatistics): { mergedEvents: AggregateStatistics } {
    const result: AggregateStatistics = statistics.result<MergeEventsStatisticsResult>().results as AggregateStatistics;
    return { mergedEvents: result };
  }
}

type CumulativeRecord = Record<string, { opened: number; closed: number; trend: number }>;
type CumulativeStatisticRecord = Record<string, CumulativeRecord[]>;

class CumulativeStatisticBuilder implements StatisticBuilder<{ cumulativeStatistics: CumulativeStatisticRecord[] }> {
  build(statistics: GitStatistics): { cumulativeStatistics: CumulativeStatisticRecord[] } {
    const result: CumulativeStatisticRecord[] = [];
    statistics.result<Map<Unit, CumulativeStatistic[]>>().results.forEach((value, key) => {
      result.push({
        [key]: value.map((statistic) => ({
          [statistic.index]: { opened: statistic.opened, closed: statistic.closed, trend: statistic.trend },
        })),
      });
    });
    return { cumulativeStatistics: result };
  }
}

class ConsoleContentBuilder {
  private static statisticsBuilder: Map<string, StatisticBuilder<any>> = new Map<string, StatisticBuilder<any>>([
    ["mergedEventsStatistics", new MergedEventsStatisticByPeriodBuilder()],
    ["mergeEvents", new MergeEventsStatisticBuilder()],
    ["cumulativeStatistics", new CumulativeStatisticBuilder()],
  ]);

  constructor(private readonly key: string, private readonly statistics: GitStatistics) {}

  build(): object {
    return ConsoleContentBuilder.statisticsBuilder.get(this.key).build(this.statistics);
  }
}

export class ConsoleWriter implements Writer {
  constructor(private readonly console: GitFlowsConsole = new TerminalConsole()) {}

  write(stats: StatisticsAggregate): void {
    const statistics = Object.entries(stats).map(([key, value]) => {
      const content = new ConsoleContentBuilder(key, value).build();
      return {
        ...content,
      };
    });
    this.console.log(statistics);
  }
}
