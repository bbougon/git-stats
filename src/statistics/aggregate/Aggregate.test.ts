import { AbstractGitEventStatistics, GitEventStatisticsResult } from "./Aggregate";
import { GitEvent } from "../Statistics";
import { parseISO } from "date-fns";

class DummyAggregateStatistic extends AbstractGitEventStatistics {
  protected get closedEvents(): GitEvent[] {
    return [];
  }

  protected get openedEvents(): GitEvent[] {
    return [];
  }

  protected timeSpent(difference: (dateLeft: Date, dateRight: Date) => number): { duration: number; length: number } {
    return { duration: 0, length: 0 };
  }
}

describe("Aggregated statistics", () => {
  it("should return a duration of 0 when no events", () => {
    const dummyAggregateStatistic = new DummyAggregateStatistic([], {
      end: parseISO("2020-02-01T23:59:59"),
      start: parseISO("2020-02-01T00:00:00"),
    });

    expect(dummyAggregateStatistic.result<GitEventStatisticsResult>().results).toEqual({
      average: {
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      },
      total: {
        closed: 0,
        opened: 0,
        all: 0,
      },
    });
  });
});
