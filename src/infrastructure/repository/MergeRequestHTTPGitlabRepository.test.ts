import { enableFetchMocks } from "jest-fetch-mock";
import { formatISO, parseISO } from "date-fns";
import { MergedRequestHTTPGitlabRepository } from "./MergeRequestHTTPGitlabRepository";
import { MergeRequestBuilder } from "../../__tests__/builder";
import { MergeEvents } from "../../merge-events/MergeEvents";
import { MergeEventDTO } from "./GitRepository";
import { MergeRequestsStatsParameters } from "../../merge-events/Gitlab";

describe("Gitlab Repository", () => {
  let firstMergeRequest: MergeEvents;
  let secondMergeRequest: MergeEvents;
  let thirdMergeRequest: MergeEvents;
  beforeEach(() => {
    enableFetchMocks();
    fetchMock.resetMocks();
    firstMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .mergedAt(parseISO("2021-11-04T13:24:12"))
      .build();
    secondMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2021-11-05T12:45:12"))
      .mergedAt(parseISO("2021-11-09T12:45:12"))
      .build();
    thirdMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2021-11-08T12:45:12"))
      .mergedAt(parseISO("2021-11-13T12:45:12"))
      .build();
  });

  const toGitlabDTO = (mergeRequest: MergeEvents): MergeEventDTO => {
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
    fetchMock.mockResponses(
      [
        JSON.stringify([toGitlabDTO(firstMergeRequest)]),
        {
          status: 200,
          headers: {
            link: '<http://gitlab/merge_requests?order_by=created_at&page=2>; rel="next", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=3>; rel="last"',
          },
        },
      ],
      [
        JSON.stringify([toGitlabDTO(secondMergeRequest)]),
        {
          status: 200,
          headers: {
            link: '<http://gitlab/merge_requests?order_by=created_at&page=3>; rel="next", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=3>; rel="last"',
          },
        },
      ],
      [
        JSON.stringify([toGitlabDTO(thirdMergeRequest)]),
        {
          status: 200,
          headers: {
            link: '<http://gitlab/merge_requests?order_by=created_at&page=1>; rel="first", <http://gitlab/merge_requests?order_by=created_at&page=1>; rel="last"',
          },
        },
      ]
    );

    const mergeRequestParamaters = {
      projectId: 1,
      fromDate: parseISO("2021-11-03T00:00:00Z"),
      toDate: parseISO("2021-11-10T00:00:00Z"),
    } as MergeRequestsStatsParameters;
    const mergeRequests = await new MergedRequestHTTPGitlabRepository("my-token").getMergeEventsForPeriod(
      mergeRequestParamaters
    );

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://gitlab.com/api/v4/projects/1/merge_requests?created_after=2021-11-03T00:00:00.000Z&per_page=100",
      { headers: { "PRIVATE-TOKEN": "my-token" } }
    );
    expect(fetch).toHaveBeenNthCalledWith(2, "http://gitlab/merge_requests?order_by=created_at&page=2", {
      headers: { "PRIVATE-TOKEN": "my-token" },
    });
    expect(fetch).toHaveBeenNthCalledWith(3, "http://gitlab/merge_requests?order_by=created_at&page=3", {
      headers: { "PRIVATE-TOKEN": "my-token" },
    });
    expect(mergeRequests).toEqual([firstMergeRequest, secondMergeRequest, thirdMergeRequest]);
  });

  test("should not paginate if only one result page", async () => {
    fetchMock.mockResponses([
      JSON.stringify([toGitlabDTO(firstMergeRequest), toGitlabDTO(secondMergeRequest)]),
      {
        status: 200,
        headers: {
          link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='last'",
        },
      },
    ]);

    const mergeRequestsParameters = {
      projectId: 1,
      fromDate: parseISO("2021-11-03T00:00:00Z"),
      toDate: parseISO("2021-11-10T00:00:00Z"),
    } as MergeRequestsStatsParameters;
    const mergeRequests = await new MergedRequestHTTPGitlabRepository("my-token").getMergeEventsForPeriod(
      mergeRequestsParameters
    );

    expect(fetch).toBeCalledTimes(1);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://gitlab.com/api/v4/projects/1/merge_requests?created_after=2021-11-03T00:00:00.000Z&per_page=100",
      { headers: { "PRIVATE-TOKEN": "my-token" } }
    );
    expect(mergeRequests).toEqual([firstMergeRequest, secondMergeRequest]);
  });

  test("should retrieve merge requests that are in the given period", async () => {
    fetchMock.mockResponses(
      [
        JSON.stringify([toGitlabDTO(firstMergeRequest)]),
        {
          status: 200,
          headers: {
            link: "<http://gitlab/merge_requests?order_by=created_at&page=2>; rel='next', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=2>; rel='last'",
          },
        },
      ],
      [
        JSON.stringify([toGitlabDTO(secondMergeRequest)]),
        {
          status: 200,
          headers: {
            link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=2>; rel='last'",
          },
        },
      ]
    );

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

  test("should retrieve merge requests in the period if there is only one result page", async () => {
    fetchMock.mockResponses([
      JSON.stringify([toGitlabDTO(firstMergeRequest), toGitlabDTO(secondMergeRequest)]),
      {
        status: 200,
        headers: {
          link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='last'",
        },
      },
    ]);

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
    const thirdMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .notYetMerged()
      .build();
    fetchMock.mockResponses([
      JSON.stringify([toGitlabDTO(firstMergeRequest), toGitlabDTO(secondMergeRequest), toGitlabDTO(thirdMergeRequest)]),
      {
        status: 200,
        headers: {
          link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='last'",
        },
      },
    ]);

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
    const thirdMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .closed(parseISO("2021-11-03T18:15:27"))
      .build();
    fetchMock.mockResponses([
      JSON.stringify([toGitlabDTO(firstMergeRequest), toGitlabDTO(secondMergeRequest), toGitlabDTO(thirdMergeRequest)]),
      {
        status: 200,
        headers: {
          link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='last'",
        },
      },
    ]);

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
});
