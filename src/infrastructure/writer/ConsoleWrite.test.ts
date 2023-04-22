import { ConsoleWriter, GitFlowsConsole } from "./ConsoleWriter";
import { MergeEventStatistics } from "../../statistics/merge-events/MergeEvent";
import { MergeEventBuilderForMR } from "../../__tests__/builder";
import { parseISO } from "date-fns";

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
    const fromDate = parseISO("2022-02-11T00:00:00");
    const toDate = parseISO("2022-02-17T00:00:00");
    const console = new TestConsole();
    const consoleWriter = new ConsoleWriter(console);

    consoleWriter.write({
      mergedEvents: new MergeEventStatistics([firstMergeRequest, secondMergeRequest, thirdMergeRequest], {
        end: toDate,
        start: fromDate,
      }),
    });

    expect(console.message).toEqual([
      {
        average: {
          days: 3,
          hours: 3,
          minutes: 0,
          months: 0,
          seconds: 0,
        },
        data: [
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
        total: {
          all: 3,
          closed: 0,
          merged: 2,
          opened: 1,
        },
      },
    ]);
  });
});
