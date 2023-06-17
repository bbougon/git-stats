import { IssueEventStatistics } from "./Issues";
import { IssueEventBuilder, IssueEventsBuilder } from "../../__tests__/builder";
import { parseISO } from "date-fns";

describe("Issues statistics", () => {
  it("closed events after period ends should be accounted as opened events", () => {
    const start = parseISO("2023-01-01T00:00:00");
    const end = parseISO("2023-01-31T23:59:59");
    const firstClosedIssue = new IssueEventBuilder()
      .createdAt(parseISO("2023-01-14T14:00:00"))
      .closedAt(parseISO("2023-01-15T12:00:00"))
      .build();
    const secondClosedIssue = new IssueEventBuilder()
      .createdAt(parseISO("2023-01-28T14:00:00"))
      .closedAt(parseISO("2023-01-31T12:00:00"))
      .build();
    const firstOpenedIssue = new IssueEventBuilder().createdAt(parseISO("2023-01-29T14:00:00")).build();
    const secondOpenedIssue = new IssueEventBuilder()
      .createdAt(parseISO("2023-01-30T14:00:00"))
      .closedAt(parseISO("2023-02-12T12:00:00"))
      .build();
    const thirdOpenedIssue = new IssueEventBuilder()
      .createdAt(parseISO("2023-01-31T14:00:00"))
      .closedAt(parseISO("2023-02-01T12:00:00"))
      .build();

    const issues = new IssueEventStatistics(
      [firstClosedIssue, secondClosedIssue, firstOpenedIssue, secondOpenedIssue, thirdOpenedIssue],
      { end, start }
    ).result().results.total;

    expect(issues.all).toEqual(5);
    expect(issues.opened).toEqual(3);
    expect(issues.closed).toEqual(2);
  });
});
