import { MergeRequestStats } from "../../merge-requests/MergeRequest";
import { HTMLWriter } from "./HTMLWriter";
import { mkdtemp } from "node:fs/promises";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { MergeRequestBuilder } from "../../__tests__/builder";
import { parseISO } from "date-fns";

describe("HTML writer", () => {
  test("should generate an HTML report file for merged requests", async () => {
    const firstMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2022-02-11T12:37:22"))
      .mergedAt(parseISO("2022-02-14T11:53:17"))
      .build();
    const secondMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2022-02-12T13:22:54"))
      .mergedAt(parseISO("2022-02-12T18:17:32"))
      .build();
    const thirdMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2022-02-13T09:17:34"))
      .mergedAt(parseISO("2022-02-16T16:44:22"))
      .build();
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "report-"));

    new HTMLWriter(tempDirectory).write({
      stats: new MergeRequestStats([firstMergeRequest, secondMergeRequest, thirdMergeRequest]),
      period: { fromDate: parseISO("2022-02-11T00:00:00"), toDate: parseISO("2022-02-17T00:00:00") },
    });

    expect(fs.readFileSync(`${tempDirectory}/index.html`, "utf8")).toMatchSnapshot();
  });

  test("should generate an HTML report file for merged requests when some mr are not yet merged", async () => {
    const firstMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2022-02-11T12:37:22"))
      .mergedAt(parseISO("2022-02-14T11:53:17"))
      .build();
    const secondMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2022-02-12T13:22:54"))
      .notYetMerged()
      .build();
    const thirdMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2022-02-13T09:17:34"))
      .mergedAt(parseISO("2022-02-16T16:44:22"))
      .build();
    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "report-"));

    new HTMLWriter(tempDirectory).write({
      stats: new MergeRequestStats([firstMergeRequest, secondMergeRequest, thirdMergeRequest]),
      period: { fromDate: parseISO("2022-02-11T00:00:00"), toDate: parseISO("2022-02-17T00:00:00") },
    });

    expect(fs.readFileSync(`${tempDirectory}/index.html`, "utf8")).toMatchSnapshot();
  });
});
