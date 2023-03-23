import { enableFetchMocks } from "jest-fetch-mock";
import { formatISO, parseISO } from "date-fns";
import { MergedRequestHTTPGitlabRepository, MergeRequestDTO } from "./MergeRequestHTTPGitlabRepository";
import { MergeRequestBuilder } from "../../__tests__/builder";
import { MergeRequest } from "../../merge-requests/MergeRequest";

describe("Gitlab Repository", () => {
  beforeEach(() => {
    enableFetchMocks();
    fetchMock.resetMocks();
  });

  const toGitlabDTO = (mergeRequest: MergeRequest): MergeRequestDTO => {
    return {
      created_at: formatISO(mergeRequest.createdAt),
      id: mergeRequest.id,
      project_id: mergeRequest.projectId,
      merged_at: formatISO(mergeRequest.mergedAt),
    };
  };

  test("should paginate results", async () => {
    const firstMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .mergedAt(parseISO("2021-11-04T13:24:12"))
      .build();
    const secondMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2021-11-05T12:45:12"))
      .mergedAt(parseISO("2021-11-09T12:45:12"))
      .build();
    const thirdMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2021-11-08T12:45:12"))
      .mergedAt(parseISO("2021-11-13T12:45:12"))
      .build();
    fetchMock.mockResponses(
      [
        JSON.stringify([toGitlabDTO(firstMergeRequest)]),
        {
          status: 200,
          headers: {
            link: "<http://gitlab/merge_requests?order_by=created_at&page=2>; rel='next', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=3>; rel='last'",
          },
        },
      ],
      [
        JSON.stringify([toGitlabDTO(secondMergeRequest)]),
        {
          status: 200,
          headers: {
            link: "<http://gitlab/merge_requests?order_by=created_at&page=3>; rel='next', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=3>; rel='last'",
          },
        },
      ],
      [
        JSON.stringify([toGitlabDTO(thirdMergeRequest)]),
        {
          status: 200,
          headers: {
            link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=1>; rel='last'",
          },
        },
      ]
    );

    const mergeRequests = await new MergedRequestHTTPGitlabRepository().getMergeRequestsForPeriod(
      1,
      parseISO("2021-11-03T00:00:00"),
      parseISO("2021-11-10T00:00:00")
    );

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://gitlab.com/api/v4/projects/1/merge_requests?created_after=2021-11-02T23:00:00.000Z&per_page=100"
    );
    expect(fetch).toHaveBeenNthCalledWith(2, "http://gitlab/merge_requests?order_by=created_at&page=2");
    expect(fetch).toHaveBeenNthCalledWith(3, "http://gitlab/merge_requests?order_by=created_at&page=3");
    expect(mergeRequests).toEqual([firstMergeRequest, secondMergeRequest, thirdMergeRequest]);
  });

  test("should not paginate if only one result page", async () => {
    const firstMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .mergedAt(parseISO("2021-11-04T13:24:12"))
      .build();
    const secondMergeRequest = new MergeRequestBuilder(1)
      .createdAt(parseISO("2021-11-05T12:45:12"))
      .mergedAt(parseISO("2021-11-09T12:45:12"))
      .build();
    fetchMock.mockResponses([
      JSON.stringify([toGitlabDTO(firstMergeRequest), toGitlabDTO(secondMergeRequest)]),
      {
        status: 200,
        headers: {
          link: "<http://gitlab/merge_requests?order_by=created_at&page=1>; rel='first', <http://gitlab/merge_requests?order_by=created_at&page=3>; rel='last'",
        },
      },
    ]);

    const mergeRequests = await new MergedRequestHTTPGitlabRepository().getMergeRequestsForPeriod(
      1,
      parseISO("2021-11-03T00:00:00"),
      parseISO("2021-11-10T00:00:00")
    );

    expect(fetch).toBeCalledTimes(1);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://gitlab.com/api/v4/projects/1/merge_requests?created_after=2021-11-02T23:00:00.000Z&per_page=100"
    );
    expect(mergeRequests).toEqual([firstMergeRequest, secondMergeRequest]);
  });
});
