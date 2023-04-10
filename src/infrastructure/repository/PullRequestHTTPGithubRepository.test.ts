import { enableFetchMocks } from "jest-fetch-mock";

jest.mock("../progress-bar/ProgressBar", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return { progressBar: (_title: string) => jest.fn() };
});

import { MergeEventBuilderForPR } from "../../__tests__/builder";
import { formatISO, parseISO } from "date-fns";
import { PullRequestDTO, PullRequestHTTPGithubRepository } from "./PullRequestHTTPGithubRepository";
import { MergeEvent } from "../../statistics/merge-events/MergeEvent";
import { PullRequestsStatsParameter } from "../../statistics/Github";

describe("Github repository", () => {
  let firstPullRequest: MergeEvent;
  let secondPullRequest: MergeEvent;
  let thirdPullRequest: MergeEvent;

  //afterAll(() => jest.resetAllMocks())

  beforeEach(() => {
    enableFetchMocks();
    fetchMock.resetMocks();

    firstPullRequest = new MergeEventBuilderForPR("my-awesome-project")
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .mergedAt(parseISO("2021-11-04T13:24:12"))
      .build();
    secondPullRequest = new MergeEventBuilderForPR("my-awesome-project")
      .createdAt(parseISO("2021-11-05T12:45:12"))
      .mergedAt(parseISO("2021-11-09T12:45:12"))
      .build();
    thirdPullRequest = new MergeEventBuilderForPR("my-awesome-project")
      .createdAt(parseISO("2021-11-08T12:45:12"))
      .mergedAt(parseISO("2021-11-13T12:45:12"))
      .build();
  });

  const toGithubDTO = (mergeRequest: MergeEvent): PullRequestDTO => {
    const mergedAt = mergeRequest.mergedAt !== null ? formatISO(mergeRequest.mergedAt) : null;
    const closedAt = mergeRequest.closedAt !== null ? formatISO(mergeRequest.closedAt) : null;
    return {
      created_at: formatISO(mergeRequest.createdAt),
      id: mergeRequest.id,
      head: mergeRequest.project !== null ? { repo: { name: mergeRequest.project } } : { repo: null },
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

  it("should not retrieve repo name if not available", async () => {
    const pullRequest = new MergeEventBuilderForPR("my-awesome-project")
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .mergedAt(parseISO("2021-11-04T13:24:12"))
      .noName()
      .build();
    fetchMock.mockResponses([
      JSON.stringify([toGithubDTO(pullRequest)]),
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
    const pullRequests = await new PullRequestHTTPGithubRepository("my-token").getMergeEventsForPeriod(
      pullRequestParameters
    );

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
    expect(pullRequests).toEqual([pullRequest]);
  });
});
