import { MergeEventBuilderForMR, MergeEventBuilderForPR } from "../../__tests__/builder";
import { parseISO } from "date-fns";
import { MergeEventStatistics } from "./MergeEventsStatistics";

describe("Merge events statistics", () => {
  it("closed events after period ends should be accounted as opened events", () => {
    const start = parseISO("2023-01-01T00:00:00");
    const end = parseISO("2023-01-31T23:59:59");
    const firstClosedMergeEvent = new MergeEventBuilderForMR()
      .createdAt(parseISO("2023-01-14T14:00:00"))
      .closedAt(parseISO("2023-01-15T12:00:00"))
      .build();
    const secondClosedMergeEvent = new MergeEventBuilderForMR()
      .createdAt(parseISO("2023-01-28T14:00:00"))
      .closedAt(parseISO("2023-01-31T12:00:00"))
      .build();
    const firstOpenedMergeEvent = new MergeEventBuilderForMR().createdAt(parseISO("2023-01-29T14:00:00")).build();
    const secondOpenedMergeEvent = new MergeEventBuilderForMR()
      .createdAt(parseISO("2023-01-30T14:00:00"))
      .closedAt(parseISO("2023-02-12T12:00:00"))
      .build();
    const thirdOpenedMergeEvent = new MergeEventBuilderForMR()
      .createdAt(parseISO("2023-01-31T14:00:00"))
      .closedAt(parseISO("2023-02-01T12:00:00"))
      .build();

    const events = new MergeEventStatistics(
      [
        firstClosedMergeEvent,
        secondClosedMergeEvent,
        firstOpenedMergeEvent,
        secondOpenedMergeEvent,
        thirdOpenedMergeEvent,
      ],
      { end, start }
    ).result().results.total;

    expect(events.all).toEqual(5);
    expect(events.opened).toEqual(3);
    expect(events.closed).toEqual(2);
  });

  it("merged events after period ends should be accounted as opened events", () => {
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
    const secondOpenedMergeEvent = new MergeEventBuilderForPR()
      .createdAt(parseISO("2023-01-30T14:00:00"))
      .mergedAt(parseISO("2023-02-12T12:00:00"))
      .build();
    const thirdOpenedMergeEvent = new MergeEventBuilderForPR()
      .createdAt(parseISO("2023-01-31T14:00:00"))
      .mergedAt(parseISO("2023-02-01T12:00:00"))
      .build();

    const events = new MergeEventStatistics(
      [
        firstMergedMergeEvent,
        secondMergedMergeEvent,
        firstOpenedMergeEvent,
        secondOpenedMergeEvent,
        thirdOpenedMergeEvent,
      ],
      { end, start }
    ).result().results.total;

    expect(events.all).toEqual(5);
    expect(events.opened).toEqual(3);
    expect(events.merged).toEqual(2);
  });
});
