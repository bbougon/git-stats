import { ConsoleWriter, GitFlowsConsole } from "./ConsoleWriter";
import { MergeEvent } from "../../statistics/merge-events/MergeEvent";
import { MergeEventBuilderForMR } from "../../__tests__/builder";
import { parseISO } from "date-fns";
import { MergedEventsStatistics } from "../../statistics/MergedEventsStatistics";
import { CumulativeStatistics } from "../../statistics/CumulativeStatistics";
import { MergeEventStatistics } from "../../statistics/merge-events/MergeEventsStatistics";

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
      mergedEventsStatistics: new MergedEventsStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt,
        start: mr.start,
      })),
      cumulativeStatistics: new CumulativeStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt || mr.closedAt,
        start: mr.start,
      })),
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
    ]);
  });
});
