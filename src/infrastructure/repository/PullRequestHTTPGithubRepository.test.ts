import { MergeEventBuilderForPR } from "../../__tests__/builder.js";
import { formatISO, parseISO } from "date-fns";
import { PullRequestDTO, PullRequestHTTPGithubRepository } from "./PullRequestHTTPGithubRepository.js";
import { MergeEvent } from "../../statistics/merge-events/MergeEvent.js";
import { PullRequestsStatsParameter } from "../../statistics/Github.js";
import MockAdapter from "axios-mock-adapter";
import { axiosInstance } from "./axios";

jest.mock("../progress-bar/ProgressBar", () => {
  return { progressBar: (_title: string) => jest.fn() };
});

describe("Github repository", () => {
  let firstPullRequest: MergeEvent;
  let secondPullRequest: MergeEvent;
  let thirdPullRequest: MergeEvent;

  const mock = new MockAdapter(axiosInstance);

  afterEach(() => {
    mock.reset();
  });

  beforeEach(() => {
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
    mock
      .onGet(
        `https://api.github.com/repos/bertrand/my-awesome-project/pulls?state=all&sort=created&per_page=100`,
        "",
        expect.objectContaining({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: "Bearer my-token",
        })
      )
      .reply(200, JSON.stringify([toGithubDTO(firstPullRequest)]), {
        link: '<http://github/repos/OWNER/REPO/pulls?page=2>; rel="next", <http://github/repos/OWNER/REPO/pulls?page=1>; rel="first", <http://github/repos/OWNER/REPO/pulls?page=3>; rel="last"',
      });
    mock
      .onGet(
        "http://github/repos/OWNER/REPO/pulls?page=2",
        "",
        expect.objectContaining({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: "Bearer my-token",
        })
      )
      .reply(200, JSON.stringify([toGithubDTO(secondPullRequest)]), {
        link: '<http://github/repos/OWNER/REPO/pulls?page=3>; rel="next", <http://github/repos/OWNER/REPO/pulls?page=1>; rel="first", <http://github/repos/OWNER/REPO/pulls?page=3>; rel="last"',
      });
    mock
      .onGet(
        "http://github/repos/OWNER/REPO/pulls?page=3",
        "",
        expect.objectContaining({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: "Bearer my-token",
        })
      )
      .reply(200, JSON.stringify([toGithubDTO(thirdPullRequest)]), {
        link: '<http://github/repos/OWNER/REPO/pulls?page=1>; rel="first", <http://github/repos/OWNER/REPO/pulls?page=3>; rel="last"',
      });

    const pullRequestParameters = {
      repo: "my-awesome-project",
      fromDate: parseISO("2021-11-03T00:00:00Z"),
      toDate: parseISO("2021-11-10T00:00:00Z"),
      owner: "bertrand",
    } as PullRequestsStatsParameter;
    const pullRequests = await new PullRequestHTTPGithubRepository("my-token").getMergeEventsForPeriod(
      pullRequestParameters
    );

    expect(pullRequests).toEqual([firstPullRequest, secondPullRequest, thirdPullRequest]);
  });

  it("should not paginate if no link in header", async () => {
    mock
      .onGet(
        `https://api.github.com/repos/bertrand/my-awesome-project/pulls?state=all&sort=created&per_page=100`,
        "",
        expect.objectContaining({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: "Bearer my-token",
        })
      )
      .reply(200, JSON.stringify([toGithubDTO(firstPullRequest)]));

    const pullRequestParameters = {
      repo: "my-awesome-project",
      fromDate: parseISO("2021-11-03T00:00:00Z"),
      toDate: parseISO("2021-11-10T00:00:00Z"),
      owner: "bertrand",
    } as PullRequestsStatsParameter;
    const pullRequests = await new PullRequestHTTPGithubRepository("my-token").getMergeEventsForPeriod(
      pullRequestParameters
    );

    expect(pullRequests).toEqual([firstPullRequest]);
  });

  it("should not retrieve repo name if not available", async () => {
    const pullRequest = new MergeEventBuilderForPR("my-awesome-project")
      .createdAt(parseISO("2021-11-03T12:45:12"))
      .mergedAt(parseISO("2021-11-04T13:24:12"))
      .noName()
      .build();
    mock
      .onGet(
        `https://api.github.com/repos/bertrand/my-awesome-project/pulls?state=all&sort=created&per_page=100`,
        "",
        expect.objectContaining({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: "Bearer my-token",
        })
      )
      .reply(200, JSON.stringify([toGithubDTO(pullRequest)]));

    const pullRequestParameters = {
      repo: "my-awesome-project",
      fromDate: parseISO("2021-11-03T00:00:00Z"),
      toDate: parseISO("2021-11-10T00:00:00Z"),
      owner: "bertrand",
    } as PullRequestsStatsParameter;
    const pullRequests = await new PullRequestHTTPGithubRepository("my-token").getMergeEventsForPeriod(
      pullRequestParameters
    );

    expect(pullRequests).toEqual([pullRequest]);
  });
});
