import { jest } from "@jest/globals";
import { HTMLWriter } from "./HTMLWriter.js";
import { mkdtemp } from "node:fs/promises";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { parseISO } from "date-fns";
import { IssueEventBuilder, MergeEventBuilderForMR } from "../../../__tests__/builder";
import { MergeEventStatistics } from "../../../statistics/merge-events/MergeEventsStatistics";
import { CumulativeStatistics } from "../../../statistics/CumulativeStatistics";
import { MergeEvent } from "../../../statistics/merge-events/MergeEvent";
import { GitEventsStatistics } from "../../../statistics/GitEventsStatistics";
import { IssueEventStatistics } from "../../../statistics/issues/Issues";

jest.mock("../FilePathConstant", () => ({
  __dirname: "src/infrastructure/writer/",
}));

jest.mock("../OpenBrowser", () => ({
  openBrowser: jest.fn(),
}));

describe("HTML writer", () => {
  test("should generate an HTML report file for all events", async () => {
    const firstMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2022-02-11T12:37:22"))
      .mergedAt(parseISO("2022-02-14T11:53:17"))
      .build();
    const secondMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2022-02-12T13:22:54"))
      .mergedAt(parseISO("2022-02-12T18:17:32"))
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
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "report-"));
    const fromDate = parseISO("2022-02-11T00:00:00");
    const toDate = parseISO("2022-02-17T00:00:00");
    const period = {
      end: toDate,
      start: fromDate,
    };

    new HTMLWriter(tempDirectory).write({
      mergeEvents: new MergeEventStatistics(mergeEvents, period),
      cumulativeStatistics: new CumulativeStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt || mr.closedAt,
        start: mr.start,
      })),
      mergedEventsStatistics: new GitEventsStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt,
        start: mr.start,
      })),
      issues: new IssueEventStatistics(issueEvents, period),
      cumulativeIssues: new CumulativeStatistics(issueEvents, period, (event) => ({
        end: event.closedAt,
        start: event.start,
      })),
      issuesStatistics: new GitEventsStatistics(issueEvents, period, (event) => ({
        start: event.start,
        end: event.closedAt,
      })),
    });

    expect(fs.readFileSync(`${tempDirectory}/report/index.html`, "utf8")).toMatchSnapshot();
  });

  test("should generate an HTML report file for merged requests when some mr are not yet merged", async () => {
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
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "report-"));
    const fromDate = parseISO("2022-02-11T00:00:00");
    const mergeEvents = [firstMergeRequest, secondMergeRequest, thirdMergeRequest];
    const toDate = parseISO("2022-02-17T00:00:00");
    const period = {
      end: toDate,
      start: fromDate,
    };

    new HTMLWriter(tempDirectory).write({
      mergeEvents: new MergeEventStatistics(mergeEvents, period),
      cumulativeStatistics: new CumulativeStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt || mr.closedAt,
        start: mr.start,
      })),
      mergedEventsStatistics: new GitEventsStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt,
        start: mr.start,
      })),
      issues: new IssueEventStatistics([], period),
      cumulativeIssues: new CumulativeStatistics([], period, (event) => ({ end: event.closedAt, start: event.start })),
      issuesStatistics: new GitEventsStatistics([], period, (event) => ({ end: event.closedAt, start: event.start })),
    });

    expect(fs.readFileSync(`${tempDirectory}/report/index.html`, "utf8")).toMatchSnapshot();
  });

  test("should generate an HTML report file with months period", async () => {
    const firstMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2022-02-11T12:37:22"))
      .mergedAt(parseISO("2022-02-14T11:53:17"))
      .build();
    const secondMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2022-01-10T13:22:54"))
      .mergedAt(parseISO("2022-01-27T13:22:54"))
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
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "report-"));
    const period = {
      end: parseISO("2022-03-02T00:00:00"),
      start: parseISO("2022-01-01T00:00:00"),
    };

    new HTMLWriter(tempDirectory).write({
      mergeEvents: new MergeEventStatistics(mergeEvents, period),
      cumulativeStatistics: new CumulativeStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt || mr.closedAt,
        start: mr.start,
      })),
      mergedEventsStatistics: new GitEventsStatistics(mergeEvents, period, (mr: MergeEvent) => ({
        end: mr.mergedAt,
        start: mr.start,
      })),
      issues: new IssueEventStatistics(issueEvents, period),
      cumulativeIssues: new CumulativeStatistics(issueEvents, period, (event) => ({
        end: event.closedAt,
        start: event.start,
      })),
      issuesStatistics: new GitEventsStatistics(issueEvents, period, (event) => ({
        end: event.closedAt,
        start: event.start,
      })),
    });

    expect(fs.readFileSync(`${tempDirectory}/report/index.html`, "utf8")).toMatchSnapshot();
  });
});
