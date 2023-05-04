import MockAdapter from "axios-mock-adapter";
import { axiosInstance } from "../axios";
import { GitlabEventParameters } from "../../../statistics/Gitlab";
import { formatISO, parseISO } from "date-fns";
import { IssueEvent } from "../../../statistics/issues/Issues";
import { IssueEventBuilder } from "../../../__tests__/builder";
import { IssueEventDTO, IssueHTTPGitlabRepository } from "./IssueHTTPGitlabRepository";

jest.mock("../../progress-bar/ProgressBar", () => {
  return { progressBar: (_title: string) => jest.fn() };
});

describe("Gitlab Issue repository", () => {
  const mock = new MockAdapter(axiosInstance);

  afterEach(() => {
    mock.reset();
  });

  let firstIssueEvent: IssueEvent;
  let secondIssueEvent: IssueEvent;
  let thirdIssueEvent: IssueEvent;

  afterAll(() => jest.resetAllMocks());

  beforeEach(() => {
    firstIssueEvent = new IssueEventBuilder(1)
      .createdAt(parseISO("2020-11-01T11:45:12"))
      .closedAt(parseISO("2020-11-15T14:35:12"))
      .build();
    secondIssueEvent = new IssueEventBuilder(1).createdAt(parseISO("2020-11-03T13:13:27")).build();
    thirdIssueEvent = new IssueEventBuilder(1).createdAt(parseISO("2020-11-05T15:27:43")).build();
  });

  const toGitlabDTO = (issue: IssueEvent): IssueEventDTO => {
    const closedAt = issue.closedAt !== null ? formatISO(issue.closedAt) : null;
    return {
      id: issue.id,
      created_at: formatISO(issue.start),
      closed_at: closedAt,
      state: issue.state,
      project_id: issue.project,
    };
  };

  it("should retrieve issues", async () => {
    const fromDate = parseISO("2020-11-01T00:00:00Z");
    mock
      .onGet(
        `https://gitlab.com/api/v4/projects/1/issues?created_after=${fromDate.toISOString()}&per_page=100`,
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "my-token" })
      )
      .reply(200, JSON.stringify([toGitlabDTO(firstIssueEvent)]), {
        link: '<http://gitlab/issues?order_by=created_at&page=2>; rel="next", <http://gitlab/issues?order_by=created_at&page=1>; rel="first", <http://gitlab/issues?order_by=created_at&page=3>; rel="last"',
      });
    mock
      .onGet(
        "http://gitlab/issues?order_by=created_at&page=2",
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "my-token" })
      )
      .reply(200, JSON.stringify([toGitlabDTO(secondIssueEvent)]), {
        link: '<http://gitlab/issues?order_by=created_at&page=3>; rel="next", <http://gitlab/issues?order_by=created_at&page=1>; rel="first", <http://gitlab/issues?order_by=created_at&page=3>; rel="last"',
      });
    mock
      .onGet(
        "http://gitlab/issues?order_by=created_at&page=3",
        "",
        expect.objectContaining({ "PRIVATE-TOKEN": "my-token" })
      )
      .reply(200, JSON.stringify([toGitlabDTO(thirdIssueEvent)]), {
        link: '<http://gitlab/issues?order_by=created_at&page=1>; rel="first", <http://gitlab/issues?order_by=created_at&page=1>; rel="last"',
      });

    const parameters = {
      projectId: 1,
      fromDate: fromDate,
      toDate: parseISO("2021-11-10T00:00:00Z"),
    } as GitlabEventParameters;
    const issues = await new IssueHTTPGitlabRepository("my-token").getEventsForPeriod(parameters);

    expect(issues).toEqual([firstIssueEvent, secondIssueEvent, thirdIssueEvent]);
  });
});
