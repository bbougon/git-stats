import { MergeEventBuilderForPR } from "../__tests__/builder";
import { parseISO } from "date-fns";
import { GitEventsStatistics } from "./GitEventsStatistics";
import { MergeEvent } from "./merge-events/MergeEvent";

describe("Git event statistics", () => {
  describe("for merge events", () => {
    it("should not take into account events that are merged after period ends", () => {
      const start = parseISO("2023-01-01T00:00:00");
      const end = parseISO("2023-01-31T23:59:59");
      const firstMergedMergeEvent = new MergeEventBuilderForPR()
        .createdAt(parseISO("2023-01-14T14:00:00"))
        .mergedAt(parseISO("2023-01-15T12:00:00"))
        .build();
      const secondMergedMergeEvent = new MergeEventBuilderForPR()
        .createdAt(parseISO("2023-01-28T14:00:00"))
        .mergedAt(parseISO("2023-01-31T12:00:00"))
        .build();
      const firstOpenedMergeEvent = new MergeEventBuilderForPR().createdAt(parseISO("2023-01-29T14:00:00")).build();
      const firstMergeEventAfterPeriodEnds = new MergeEventBuilderForPR()
        .createdAt(parseISO("2023-01-30T14:00:00"))
        .mergedAt(parseISO("2023-02-12T12:00:00"))
        .build();
      const secondMergeEventAfterPeriodEnds = new MergeEventBuilderForPR()
        .createdAt(parseISO("2023-01-31T14:00:00"))
        .mergedAt(parseISO("2023-02-01T12:00:00"))
        .build();

      const result = new GitEventsStatistics(
        [
          firstMergedMergeEvent,
          secondMergedMergeEvent,
          firstOpenedMergeEvent,
          firstMergeEventAfterPeriodEnds,
          secondMergeEventAfterPeriodEnds,
        ],
        { start, end },
        (mr: MergeEvent) => ({
          end: mr.mergedAt,
          start: mr.start,
        })
      ).result();

      expect(result.results.get(2023)[0].Month).toEqual([
        {
          events: [
            { start: firstMergedMergeEvent.start, end: firstMergedMergeEvent.mergedAt },
            { start: secondMergedMergeEvent.start, end: secondMergedMergeEvent.mergedAt },
          ],
          index: 0,
        },
      ]);
      expect(result.results.get(2023)[1].Week).toEqual([
        {
          events: [],
          index: 1,
        },
        {
          events: [],
          index: 2,
        },
        {
          events: [{ start: firstMergedMergeEvent.start, end: firstMergedMergeEvent.mergedAt }],
          index: 3,
        },
        {
          events: [],
          index: 4,
        },
        {
          events: [{ start: secondMergedMergeEvent.start, end: secondMergedMergeEvent.mergedAt }],
          index: 5,
        },
      ]);
    });
  });
});
