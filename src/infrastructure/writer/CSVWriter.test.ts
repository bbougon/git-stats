import { IssueEventBuilder, MergeEventBuilderForMR } from "../../__tests__/builder.js";
import { mkdtemp } from "node:fs/promises";
import path from "path";
import os from "os";
import fs from "fs";
import { parseISO } from "date-fns";
import { CSVWriter } from "./CSVWriter.js";
import {
  GitlabMemoryRepositories,
  IssueEventsMemoryRepository,
  MergeRequestMemoryRepository,
} from "../../__tests__/MemoryRepositories";
import { gitStatistics } from "../../statistics/GitStatistics";
import { GitlabEventParameters } from "../../statistics/Gitlab";
import { Repositories } from "../../statistics/Repositories";

describe("CSV writer", () => {
  beforeEach(() => {
    new GitlabMemoryRepositories();
  });

  test("should generate a CSV report file with all merge events and issue events", async () => {
    const mergeRequestBuilder = new MergeEventBuilderForMR(1);
    const firstMergeRequest = mergeRequestBuilder
      .id(1)
      .createdAt(parseISO("2022-02-11T12:37:22+01:00"))
      .mergedAt(parseISO("2022-02-14T11:53:17+01:00"))
      .build();
    const secondMergeRequest = mergeRequestBuilder
      .id(2)
      .createdAt(parseISO("2022-02-12T13:22:54+01:00"))
      .notYetMerged()
      .build();
    const thirdMergeRequest = mergeRequestBuilder
      .id(3)
      .createdAt(parseISO("2022-02-13T09:17:34+01:00"))
      .closedAt(parseISO("2022-02-16T16:44:22+01:00"))
      .build();
    (Repositories.mergeEvent() as MergeRequestMemoryRepository).persistAll([
      firstMergeRequest,
      secondMergeRequest,
      thirdMergeRequest,
    ]);
    const firstIssueEvent = new IssueEventBuilder(1).withId(1).createdAt(parseISO("2022-02-11T12:37:22+01:00")).build();
    const secondIssueEvent = new IssueEventBuilder(1)
      .withId(2)
      .createdAt(parseISO("2022-02-11T12:37:22+01:00"))
      .closedAt(parseISO("2022-02-14T11:53:17+01:00"))
      .build();
    (Repositories.issueEvent() as IssueEventsMemoryRepository).persistAll([firstIssueEvent, secondIssueEvent]);
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "report-"));
    const fromDate = parseISO("2022-02-11T00:00:00");
    const toDate = parseISO("2022-02-17T00:00:00");

    const stats = await gitStatistics({
      projectId: 1,
      fromDate: fromDate,
      toDate: toDate,
    } as GitlabEventParameters);
    new CSVWriter(tempDirectory).write(stats);

    expect(fs.readFileSync(`${tempDirectory}/report/report.csv`, "utf8")).toMatchSnapshot();
  });
});
