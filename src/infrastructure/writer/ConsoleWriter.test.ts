import { ConsoleWriter, GitFlowsConsole } from "./ConsoleWriter";
import { MergeEvent } from "../../statistics/merge-events/MergeEvent";
import { IssueEventBuilder, MergeEventBuilderForMR } from "../../__tests__/builder";
import { parseISO } from "date-fns";
import { GitEventsStatistics } from "../../statistics/GitEventsStatistics";
import { CumulativeStatistics } from "../../statistics/CumulativeStatistics";
import { MergeEventStatistics } from "../../statistics/merge-events/MergeEventsStatistics";
import { IssueEventStatistics } from "../../statistics/issues/Issues";

class TestConsole implements GitFlowsConsole {
  message = {};

  log(message?: any, ...optionalParams: any[]): void {
    this.message = message;
  }
}

describe("Console writer", () => {
  it("should display statistics", () => {
    const firstMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2022-02-11T12:37:22"))
      .mergedAt(parseISO("2022-02-14T11:53:17"))
      .build();
    const secondMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2022-02-12T13:22:54"))
      .notYetMerged()
      .build();
    const thirdMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2022-02-13T09:17:34"))
      .mergedAt(parseISO("2022-02-16T16:44:22"))
      .build();
    const mergeEvents = [firstMergeRequest, secondMergeRequest, thirdMergeRequest];
    const firstIssueEvent = new IssueEventBuilder(1).createdAt(parseISO("2022-02-11T12:37:22")).build();
    const secondIssueEvent = new IssueEventBuilder(1)
      .createdAt(parseISO("2022-02-11T12:37:22"))
      .closedAt(parseISO("2022-02-14T11:53:17"))
      .build();
    const issueEvents = [firstIssueEvent, secondIssueEvent];
    const fromDate = parseISO("2022-02-11T00:00:00");
    const toDate = parseISO("2022-02-17T00:00:00");
    const console = new TestConsole();
    const period = {
      end: toDate,
      start: fromDate,
    };

    const consoleWriter = new ConsoleWriter(console);
    consoleWriter.write({
      mergeEvents: new MergeEventStatistics(mergeEvents, period),
      mergedEventsStatistics: new GitEventsStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt,
        start: mr.start,
      })),
      cumulativeStatistics: new CumulativeStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt || mr.closedAt,
        start: mr.start,
      })),
      issues: new IssueEventStatistics(issueEvents, period),
    });

    expect(console.message).toEqual([
      {
        mergedEvents: {
          average: {
            days: 3,
            hours: 3,
            minutes: 21,
            months: 0,
            seconds: 21,
          },
          total: {
            all: 3,
            closed: 0,
            merged: 2,
            opened: 1,
          },
        },
      },
      {
        mergedEventsStatistics: [
          {
            "2022": [
              {
                Month: [
                  {
                    "1": 2,
                  },
                ],
              },
              {
                Week: [
                  {
                    "7": 0,
                  },
                  {
                    "8": 2,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        cumulativeStatistics: [
          {
            Week: [{ "7": { opened: 2, closed: 0, trend: 2 } }, { "8": { opened: 3, closed: 2, trend: 3 } }],
          },
          {
            Month: [{ "1": { opened: 3, closed: 2, trend: 3 } }],
          },
        ],
      },
      {
        issues: {
          average: {
            days: 2,
            hours: 23,
            minutes: 15,
            months: 0,
            seconds: 55,
          },
          total: {
            all: 2,
            closed: 1,
            opened: 1,
          },
        },
      },
    ]);
  });
});
