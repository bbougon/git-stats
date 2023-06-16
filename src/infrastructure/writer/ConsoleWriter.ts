import { Writer } from "../../../index.js";
import { StatisticsAggregate, Unit, Year } from "../../statistics/GitStatistics.js";
import { GitStatistics } from "../../statistics/Statistics.js";
import { GitEventsStatisticFlow } from "../../statistics/GitEventsStatistics.js";
import { CumulativeStatistic } from "../../statistics/CumulativeStatistics.js";
import { MergeEventsStatisticsResult } from "../../statistics/merge-events/MergeEventsStatistics.js";
import { ContentBuilder } from "./ContentBuilder.js";
import { GitEventStatisticsResult } from "../../statistics/aggregate/Aggregate.js";

export interface GitFlowsConsole {
  log(message?: any, ...optionalParams: any[]): void;
}

export class TerminalConsole implements GitFlowsConsole {
  log(message?: any, ...optionalParams: any[]): void {
    console.log(JSON.stringify(message, null, 2), optionalParams);
  }
}
type UnitRecord = Record<string, number>;
type PeriodUnitRecord = Record<string, UnitRecord[]>;
type PeriodRecord = Record<string, PeriodUnitRecord[]>;

class GitEventsStatisticByPeriodBuilder implements ContentBuilder<{ [k: string]: PeriodRecord[] }> {
  constructor(
    private readonly statistics: GitStatistics,
    private readonly statisticsKey: string = "mergedEventsStatistics"
  ) {}

  build(): { [k: string]: PeriodRecord[] } {
    const events = this.statistics.result<Map<Year, { [key: Unit]: GitEventsStatisticFlow[] }[]>>().results;
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
    return { [this.statisticsKey]: data };
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
class MergeEventsStatisticBuilder implements ContentBuilder<{ mergedEvents: AggregateStatistics }> {
  constructor(private readonly statistics: GitStatistics) {}

  build(): { mergedEvents: AggregateStatistics } {
    const result: AggregateStatistics = this.statistics.result<MergeEventsStatisticsResult>()
      .results as AggregateStatistics;
    return { mergedEvents: result };
  }
}
class IssueEventsStatisticBuilder implements ContentBuilder<{ issues: AggregateStatistics }> {
  constructor(private readonly statistics: GitStatistics) {}

  build(): { issues: AggregateStatistics } {
    const result: AggregateStatistics = this.statistics.result<GitEventStatisticsResult>()
      .results as AggregateStatistics;
    return { issues: result };
  }
}

type CumulativeRecord = Record<string, { opened: number; closed: number; trend: number }>;
type CumulativeStatisticRecord = Record<string, CumulativeRecord[]>;

class CumulativeStatisticBuilder implements ContentBuilder<{ [k: string]: CumulativeStatisticRecord[] }> {
  constructor(
    private readonly statistics: GitStatistics,
    private readonly cumulativeKey: string = "cumulativeStatistics"
  ) {}

  build(): { [k: string]: CumulativeStatisticRecord[] } {
    const result: CumulativeStatisticRecord[] = [];
    this.statistics.result<Map<Unit, CumulativeStatistic[]>>().results.forEach((value, key) => {
      result.push({
        [key]: value.map((statistic) => ({
          [statistic.index]: { opened: statistic.opened, closed: statistic.closed, trend: statistic.trend },
        })),
      });
    });
    return { [this.cumulativeKey]: result };
  }
}

type AnyStatisticsBuilder =
  | { [k: string]: PeriodRecord[] }
  | { mergedEvents: AggregateStatistics }
  | { [k: string]: CumulativeStatisticRecord[] }
  | { issues: AggregateStatistics };

class ConsoleContentBuilder {
  private static statisticsBuilder: Map<string, (statistics: GitStatistics) => ContentBuilder<AnyStatisticsBuilder>> =
    new Map<string, (statistics: GitStatistics) => ContentBuilder<AnyStatisticsBuilder>>([
      ["mergedEventsStatistics", (statistics) => new GitEventsStatisticByPeriodBuilder(statistics)],
      ["mergeEvents", (statistics) => new MergeEventsStatisticBuilder(statistics)],
      ["cumulativeStatistics", (statistics) => new CumulativeStatisticBuilder(statistics)],
      ["issues", (statistics) => new IssueEventsStatisticBuilder(statistics)],
      ["cumulativeIssues", (statistics) => new CumulativeStatisticBuilder(statistics, "cumulativeIssues")],
      ["issuesStatistics", (statistics) => new GitEventsStatisticByPeriodBuilder(statistics, "issuesStatistics")],
    ]);

  constructor(private readonly key: string, private readonly statistics: GitStatistics) {}

  build(): object {
    return ConsoleContentBuilder.statisticsBuilder.get(this.key)(this.statistics).build();
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
