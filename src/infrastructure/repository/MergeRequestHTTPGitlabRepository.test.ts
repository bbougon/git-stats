import { formatISO, parseISO } from "date-fns";
import { MergedRequestHTTPGitlabRepository } from "./MergeRequestHTTPGitlabRepository.js";
import { MergeEventBuilderForMR } from "../../__tests__/builder.js";
import { MergeEventDTO } from "./MergeEventHTTPRepository";
import { MergeEvent } from "../../statistics/merge-events/MergeEvent.js";
import { MergeRequestsStatsParameters } from "../../statistics/Gitlab.js";
import MockAdapter from "axios-mock-adapter";
import { axiosInstance } from "./axios";

jest.mock("../progress-bar/ProgressBar", () => {
  return { progressBar: (_title: string) => jest.fn() };
});

describe("Gitlab Repository", () => {
  const mock = new MockAdapter(axiosInstance);

  afterEach(() => {
    mock.reset();
  });

  let firstMergeRequest: MergeEvent;
  let secondMergeRequest: MergeEvent;
  let thirdMergeRequest: MergeEvent;

  afterAll(() => jest.resetAllMocks());
  beforeEach(() => {
    //enableFetchMocks();
    //fetchMock.resetMocks();
    firstMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .mergedAt(parseISO("2021-11-04T13:24:12"))
      .build();
    secondMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2021-11-05T12:45:12"))
      .mergedAt(parseISO("2021-11-09T12:45:12"))
      .build();
    thirdMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2021-11-08T12:45:12"))
      .mergedAt(parseISO("2021-11-13T12:45:12"))
      .build();
  });

  const toGitlabDTO = (mergeRequest: MergeEvent): MergeEventDTO => {
    const mergedAt = mergeRequest.mergedAt !== null ? formatISO(mergeRequest.mergedAt) : null;
    const closedAt = mergeRequest.closedAt !== null ? formatISO(mergeRequest.closedAt) : null;
    return {
      created_at: formatISO(mergeRequest.createdAt),
      id: mergeRequest.id,
      project_id: mergeRequest.project,
      merged_at: mergedAt,
      closed_at: closedAt,
    };
  };

  test("should paginate results", async () => {
    const fromDate = parseISO("2021-11-03T00:00:00Z");
    mock
      .onGet(
        `https://gitlab.com/api/v4/projects/1/merge_requests?created_after=${fromDate.toISOString()}&per_page=100`,
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "my-token" })
      )
      .reply(200, JSON.stringify([toGitlabDTO(firstMergeRequest)]), {
        link: '<http://gitlab/merge_requests?order_by=created_at&page=2>; rel="next", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=3>; rel="last"',
      });
    mock
      .onGet(
        "http://gitlab/merge_requests?order_by=created_at&page=2",
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "my-token" })
      )
      .reply(200, JSON.stringify([toGitlabDTO(secondMergeRequest)]), {
        link: '<http://gitlab/merge_requests?order_by=created_at&page=3>; rel="next", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=3>; rel="last"',
      });
    mock
      .onGet(
        "http://gitlab/merge_requests?order_by=created_at&page=3",
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "my-token" })
      )
      .reply(200, JSON.stringify([toGitlabDTO(thirdMergeRequest)]), {
        link: '<http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="last"',
      });

    const mergeRequestParameters = {
      projectId: 1,
      fromDate: fromDate,
      toDate: parseISO("2021-11-10T00:00:00Z"),
    } as MergeRequestsStatsParameters;
    const mergeRequests = await new MergedRequestHTTPGitlabRepository("my-token").getMergeEventsForPeriod(
      mergeRequestParameters
    );

    expect(mergeRequests).toEqual([firstMergeRequest, secondMergeRequest, thirdMergeRequest]);
  });

  test("should not paginate if only one result page", async () => {
    const fromDate = parseISO("2021-11-03T00:00:00Z");
    mock
      .onGet(
        `https://gitlab.com/api/v4/projects/1/merge_requests?created_after=${fromDate.toISOString()}&per_page=100`,
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "my-token" })
      )
      .reply(200, JSON.stringify([toGitlabDTO(firstMergeRequest), toGitlabDTO(secondMergeRequest)]), {
        link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='last'",
      });

    const mergeRequestsParameters = {
      projectId: 1,
      fromDate: fromDate,
      toDate: parseISO("2021-11-10T00:00:00Z"),
    } as MergeRequestsStatsParameters;
    const mergeRequests = await new MergedRequestHTTPGitlabRepository("my-token").getMergeEventsForPeriod(
      mergeRequestsParameters
    );

    expect(mergeRequests).toEqual([firstMergeRequest, secondMergeRequest]);
  });

  test("should retrieve merge requests that are in the given period", async () => {
    const fromDate = parseISO("2021-11-03T00:00:00");
    mock
      .onGet(
        `https://gitlab.com/api/v4/projects/1/merge_requests?created_after=${fromDate.toISOString()}&per_page=100`,
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "a-token" })
      )
      .reply(200, JSON.stringify([toGitlabDTO(firstMergeRequest)]), {
        link: "<http://gitlab/merge_requests?order_by=created_at&page=2>; rel='next', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=2>; rel='last'",
      });
    mock
      .onGet(
        "http://gitlab/merge_requests?order_by=created_at&page=2",
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "my-token" })
      )
      .reply(200, JSON.stringify([toGitlabDTO(secondMergeRequest)]), {
        link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=2>; rel='last'",
      });

    const mergeRequestsParameters = {
      projectId: 1,
      fromDate: fromDate,
      toDate: parseISO("2021-11-04T00:00:00"),
    } as MergeRequestsStatsParameters;
    const mergeRequests = await new MergedRequestHTTPGitlabRepository("a-token").getMergeEventsForPeriod(
      mergeRequestsParameters
    );

    expect(mergeRequests).toEqual([firstMergeRequest]);
  });

  test("should retrieve merge requests in the period if there is only one result page", async () => {
    const fromDate = parseISO("2021-11-03T00:00:00");
    mock
      .onGet(
        `https://gitlab.com/api/v4/projects/1/merge_requests?created_after=${fromDate.toISOString()}&per_page=100`,
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "a-token" })
      )
      .reply(200, JSON.stringify([toGitlabDTO(firstMergeRequest)]), {
        link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='last'",
      });

    const mergeRequestsParameters = {
      projectId: 1,
      fromDate: parseISO("2021-11-03T00:00:00"),
      toDate: parseISO("2021-11-04T00:00:00"),
    } as MergeRequestsStatsParameters;
    const mergeRequests = await new MergedRequestHTTPGitlabRepository("a-token").getMergeEventsForPeriod(
      mergeRequestsParameters
    );

    expect(mergeRequests).toEqual([firstMergeRequest]);
  });

  test("should retrieve merge requests even if not merged", async () => {
    const thirdMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .notYetMerged()
      .build();
    const fromDate = parseISO("2021-11-03T00:00:00");
    mock
      .onGet(
        `https://gitlab.com/api/v4/projects/1/merge_requests?created_after=${fromDate.toISOString()}&per_page=100`,
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "a-token" })
      )
      .reply(
        200,
        JSON.stringify([
          toGitlabDTO(firstMergeRequest),
          toGitlabDTO(secondMergeRequest),
          toGitlabDTO(thirdMergeRequest),
        ]),
        {
          link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='last'",
        }
      );

    const mergeRequestsParameters = {
      projectId: 1,
      fromDate: parseISO("2021-11-03T00:00:00"),
      toDate: parseISO("2021-11-04T00:00:00"),
    } as MergeRequestsStatsParameters;
    const mergeRequests = await new MergedRequestHTTPGitlabRepository("a-token").getMergeEventsForPeriod(
      mergeRequestsParameters
    );

    expect(mergeRequests).toEqual([firstMergeRequest, thirdMergeRequest]);
  });

  test("should retrieve closed merge requests", async () => {
    const thirdMergeRequest = new MergeEventBuilderForMR(1)
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .closedAt(parseISO("2021-11-03T18:15:27"))
      .build();
    const fromDate = parseISO("2021-11-03T00:00:00");
    mock
      .onGet(
        `https://gitlab.com/api/v4/projects/1/merge_requests?created_after=${fromDate.toISOString()}&per_page=100`,
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "a-token" })
      )
      .reply(
        200,
        JSON.stringify([
          toGitlabDTO(firstMergeRequest),
          toGitlabDTO(secondMergeRequest),
          toGitlabDTO(thirdMergeRequest),
        ]),
        {
          link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='last'",
        }
      );

    const mergeRequestsParameters = {
      projectId: 1,
      fromDate: parseISO("2021-11-03T00:00:00"),
      toDate: parseISO("2021-11-04T00:00:00"),
    } as MergeRequestsStatsParameters;
    const mergeRequests = await new MergedRequestHTTPGitlabRepository("a-token").getMergeEventsForPeriod(
      mergeRequestsParameters
    );

    expect(mergeRequests).toEqual([firstMergeRequest, thirdMergeRequest]);
  });

  it("should handle HTTP Not Found error", () => {
    expect.assertions(1);
    const fromDate = parseISO("2021-11-03T00:00:00");
    mock
      .onGet(
        `https://gitlab.com/api/v4/projects/666/merge_requests?created_after=${fromDate.toISOString()}&per_page=100`,
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "a-token" })
      )
      .reply(404, "we could not find");
    const mergeRequestsParameters = {
      projectId: 666,
      fromDate,
      toDate: parseISO("2021-11-04T00:00:00"),
    } as MergeRequestsStatsParameters;

    new MergedRequestHTTPGitlabRepository("a-token").getMergeEventsForPeriod(mergeRequestsParameters).catch((reason) =>
      expect(reason).toEqual({
        rationale: "We were unable to retrieve some informations on your project '666'",
        additionalInfo: "we could not find",
      })
    );
  });
});
