import { enableFetchMocks } from "jest-fetch-mock";
import { PullRequestBuilder } from "../../__tests__/builder";
import { MergeEvents } from "../../merge-events/MergeEvents";
import { formatISO, parseISO } from "date-fns";
import { PullRequestsStatsParameter } from "../../merge-events/Github";
import { PullRequestDTO, PullRequestHTTPGithubRepository } from "./PullRequestHTTPGithubRepository";

describe("Github repository", () => {
  let firstPullRequest: MergeEvents;
  let secondPullRequest: MergeEvents;
  let thirdPullRequest: MergeEvents;

  beforeEach(() => {
    enableFetchMocks();
    fetchMock.resetMocks();

    firstPullRequest = new PullRequestBuilder("my-awesome-project")
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .mergedAt(parseISO("2021-11-04T13:24:12"))
      .build();
    secondPullRequest = new PullRequestBuilder("my-awesome-project")
      .createdAt(parseISO("2021-11-05T12:45:12"))
      .mergedAt(parseISO("2021-11-09T12:45:12"))
      .build();
    thirdPullRequest = new PullRequestBuilder("my-awesome-project")
      .createdAt(parseISO("2021-11-08T12:45:12"))
      .mergedAt(parseISO("2021-11-13T12:45:12"))
      .build();
  });

  const toGithubDTO = (mergeRequest: MergeEvents): PullRequestDTO => {
    const mergedAt = mergeRequest.mergedAt !== null ? formatISO(mergeRequest.mergedAt) : null;
    const closedAt = mergeRequest.closedAt !== null ? formatISO(mergeRequest.closedAt) : null;
    return {
      created_at: formatISO(mergeRequest.createdAt),
      id: mergeRequest.id,
      head: { repo: { name: mergeRequest.project } },
      merged_at: mergedAt,
      closed_at: closedAt,
    } as PullRequestDTO;
  };

  it("should paginate result", async () => {
    fetchMock.mockResponses(
      [
        JSON.stringify([toGithubDTO(firstPullRequest)]),
        {
          status: 200,
          headers: {
            link: '<http://github/repos/OWNER/REPO/pulls?page=2>; rel="next", <http://github/repos/OWNER/REPO/pulls?page=1>; rel="first", <http://github/repos/OWNER/REPO/pulls?page=3>; rel="last"',
          },
        },
      ],
      [
        JSON.stringify([toGithubDTO(secondPullRequest)]),
        {
          status: 200,
          headers: {
            link: '<http://github/repos/OWNER/REPO/pulls?page=3>; rel="next", <http://github/repos/OWNER/REPO/pulls?page=1>; rel="first", <http://github/repos/OWNER/REPO/pulls?page=3>; rel="last"',
          },
        },
      ],
      [
        JSON.stringify([toGithubDTO(thirdPullRequest)]),
        {
          status: 200,
          headers: {
            link: '<http://github/repos/OWNER/REPO/pulls?page=1>; rel="first", <http://github/repos/OWNER/REPO/pulls?page=3>; rel="last"',
          },
        },
      ]
    );

    const pullRequestParameters = {
      repo: "my-awesome-project",
      fromDate: parseISO("2021-11-03T00:00:00Z"),
      toDate: parseISO("2021-11-10T00:00:00Z"),
      owner: "bertrand",
    } as PullRequestsStatsParameter;
    await new PullRequestHTTPGithubRepository("my-token").getMergeEventsForPeriod(pullRequestParameters);

    const expectedHeaders = {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer my-token",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/bertrand/my-awesome-project/pulls?state=all&sort=created&per_page=100",
      expectedHeaders
    );
    expect(fetch).toHaveBeenNthCalledWith(2, "http://github/repos/OWNER/REPO/pulls?page=2", expectedHeaders);
    expect(fetch).toHaveBeenNthCalledWith(3, "http://github/repos/OWNER/REPO/pulls?page=3", expectedHeaders);
  });

  it("should not paginate if no link in header", async () => {
    fetchMock.mockResponses([
      JSON.stringify([toGithubDTO(firstPullRequest)]),
      {
        status: 200,
      },
    ]);

    const pullRequestParameters = {
      repo: "my-awesome-project",
      fromDate: parseISO("2021-11-03T00:00:00Z"),
      toDate: parseISO("2021-11-10T00:00:00Z"),
      owner: "bertrand",
    } as PullRequestsStatsParameter;
    await new PullRequestHTTPGithubRepository("my-token").getMergeEventsForPeriod(pullRequestParameters);

    const expectedHeaders = {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer my-token",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/bertrand/my-awesome-project/pulls?state=all&sort=created&per_page=100",
      expectedHeaders
    );
  });
});
