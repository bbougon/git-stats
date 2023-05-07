import MockAdapter from "axios-mock-adapter";
import { axiosInstance } from "../axios";
import { PullRequestsStatsParameter } from "../../../statistics/Github";
import { formatISO, parseISO } from "date-fns";
import { IssueEvent } from "../../../statistics/issues/Issues";
import { IssueEventBuilder } from "../../../__tests__/builder";
import { IssueEventGithubDTO, IssueHTTPGithubRepository } from "./IssueHTTPGithubRepository";

jest.mock("../../progress-bar/ProgressBar", () => {
  return { progressBar: (_title: string) => jest.fn() };
});

describe("Github issues repository", () => {
  let firstIssueEvent: IssueEvent;
  let secondIssueEvent: IssueEvent;
  let thirdIssueEvent: IssueEvent;

  const mock = new MockAdapter(axiosInstance);

  afterEach(() => {
    mock.reset();
  });

  beforeEach(() => {
    firstIssueEvent = new IssueEventBuilder(undefined)
      .createdAt(parseISO("2021-11-03T15:18:26"))
      .closedAt(parseISO("2021-11-03T17:43:32"))
      .build();
    secondIssueEvent = new IssueEventBuilder(undefined).createdAt(parseISO("2021-11-08T09:27:56")).build();
    thirdIssueEvent = new IssueEventBuilder(undefined)
      .createdAt(parseISO("2021-11-06T07:37:26"))
      .closedAt(parseISO("2021-11-09T17:43:32"))
      .build();
  });

  const toGithubDTO = (event: IssueEvent): IssueEventGithubDTO => {
    const stateMap: Map<string, string> = new Map<string, string>([
      ["closed", "closed"],
      ["opened", "open"],
    ]);
    return {
      closed_at: event.closedAt !== null ? formatISO(event.closedAt) : null,
      created_at: formatISO(event.start),
      id: event.id,
      state: stateMap.get(event.state),
      repository: { name: event.project as string },
      pull_request: undefined,
    };
  };

  it("should retrieve issues", async () => {
    mock
      .onGet(
        `https://api.github.com/repos/bertrand/my-awesome-project/issues?state=all&sort=created&per_page=100`,
        "",
        expect.objectContaining({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: "Bearer my-token",
        })
      )
      .reply(200, JSON.stringify([toGithubDTO(firstIssueEvent)]), {
        link: '<http://github/repos/OWNER/REPO/issues?page=2>; rel="next", <http://github/repos/OWNER/REPO/issues?page=1>; rel="first", <http://github/repos/OWNER/REPO/issues?page=3>; rel="last"',
      });
    mock
      .onGet(
        "http://github/repos/OWNER/REPO/issues?page=2",
        "",
        expect.objectContaining({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: "Bearer my-token",
        })
      )
      .reply(200, JSON.stringify([toGithubDTO(secondIssueEvent)]), {
        link: '<http://github/repos/OWNER/REPO/issues?page=3>; rel="next", <http://github/repos/OWNER/REPO/issues?page=1>; rel="first", <http://github/repos/OWNER/REPO/issues?page=3>; rel="last"',
      });
    mock
      .onGet(
        "http://github/repos/OWNER/REPO/issues?page=3",
        "",
        expect.objectContaining({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: "Bearer my-token",
        })
      )
      .reply(200, JSON.stringify([toGithubDTO(thirdIssueEvent)]), {
        link: '<http://github/repos/OWNER/REPO/issues?page=1>; rel="first", <http://github/repos/OWNER/REPO/issues?page=3>; rel="last"',
      });

    const Parameters = {
      repo: "my-awesome-project",
      fromDate: parseISO("2021-11-03T00:00:00Z"),
      toDate: parseISO("2021-11-10T00:00:00Z"),
      owner: "bertrand",
    } as PullRequestsStatsParameter;
    const pullRequests = await new IssueHTTPGithubRepository("my-token").getEventsForPeriod(Parameters);

    expect(pullRequests).toEqual([firstIssueEvent, thirdIssueEvent, secondIssueEvent]);
  });

  it("should retrieve only issues, i.e: remove pull requests", async () => {
    const build = new IssueEventBuilder(1).createdAt(parseISO("2021-11-04T12:56:43")).build();
    const pullRequestDTO = toGithubDTO(build);
    const pullRequestEvent = {
      ...pullRequestDTO,
      pull_request: {
        url: "https://api.github.com/repos/bbougon/git-stats/pulls/11",
        html_url: "https://github.com/bbougon/git-stats/pull/11",
        diff_url: "https://github.com/bbougon/git-stats/pull/11.diff",
        patch_url: "https://github.com/bbougon/git-stats/pull/11.patch",
        merged_at: "2023-04-11T21:29:42Z",
      },
    };
    mock
      .onGet(
        `https://api.github.com/repos/bertrand/my-awesome-project/issues?state=all&sort=created&per_page=100`,
        "",
        expect.objectContaining({
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: "Bearer my-token",
        })
      )
      .reply(200, JSON.stringify([toGithubDTO(firstIssueEvent), pullRequestEvent]), {});

    const Parameters = {
      repo: "my-awesome-project",
      fromDate: parseISO("2021-11-03T00:00:00Z"),
      toDate: parseISO("2021-11-10T00:00:00Z"),
      owner: "bertrand",
    } as PullRequestsStatsParameter;
    const pullRequests = await new IssueHTTPGithubRepository("my-token").getEventsForPeriod(Parameters);

    expect(pullRequests).toEqual([firstIssueEvent]);
  });
});
