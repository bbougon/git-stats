#!/usr/bin/env node
import { Command, program } from "commander";
import { MergedRequestHTTPGitlabRepository } from "./src/infrastructure/repository/MergeRequestHTTPGitlabRepository.js";
import { parseISO } from "date-fns";
import { ConsoleWriter } from "./src/infrastructure/writer/ConsoleWriter.js";
import { HTMLWriter } from "./src/infrastructure/writer/HTMLWriter.js";
import { PullRequestHTTPGithubRepository } from "./src/infrastructure/repository/PullRequestHTTPGithubRepository.js";
import { CSVWriter } from "./src/infrastructure/writer/CSVWriter.js";
import { gitStatistics, StatisticsAggregate } from "./src/statistics/GitStatistics.js";
import { MergeEventRepository } from "./src/statistics/merge-events/MergeEvent.js";
import { MergeRequestsStatsParameters } from "./src/statistics/Gitlab.js";
import { PullRequestsStatsParameter } from "./src/statistics/Github.js";
import { ProgressBar } from "./src/infrastructure/progress-bar/ProgressBar.js";
import * as chalk from "./src/infrastructure/progress-bar/Chalk.js";
import { HTTPError } from "./src/infrastructure/repository/MergeEventHTTPRepository.js";

type Period = {
  start: Date;
  end: Date;
};

const commaSeparatedList = (list: string): Period => {
  const period = list.split(",");
  if (period.length === 1) {
    return {
      end: new Date(),
      start: parseISO(period[0]),
    };
  }
  return { end: parseISO(period[1]), start: parseISO(period[0]) };
};

const writer = (format: string): Writer => {
  if (format === "html") {
    return new HTMLWriter("./");
  }
  if (format === "csv") {
    return new CSVWriter("./");
  }
  return new ConsoleWriter();
};

export interface Writer {
  write(stats: StatisticsAggregate): void;
}
export type RequestParameters = {
  fromDate: Date;
  toDate: Date;
};
type CommandParameters = {
  requestParameters: RequestParameters;
  options: any;
  token: string;
};

function isHTTPError(reason: HTTPError | string | never): reason is HTTPError {
  return (reason as HTTPError).rationale !== undefined;
}

const gitlabCommand = program
  .command("gitlab")
  .description("Provide merge requests statistics on a Gitlab project for a given period")
  .argument("<token>", "your gitlab API token")
  .argument("<projectId>", "gitlab project id for which you want to have statistics")
  .argument(
    "<period>",
    "the period you want to analyse (ISO formatted date with\nthe start period, e.g: 2021-11-02\nor separated by comma, e.g: 2021-11-02,2021-11-03 to retrieve merged events between these 2 dates)",
    commaSeparatedList
  );

const githubCommand = program
  .command("github")
  .description("Provide pull requests statistics on a GitHub project for a given period")
  .argument("<token>", "your github API token")
  .argument("<owner>", "The account owner of the repository. The name is not case sensitive")
  .argument("<repo>", "The name of the repository. The name is not case sensitive.")
  .argument(
    "<period>",
    "the period you want to analyse (ISO formatted date with\nthe start period, e.g: 2021-11-02\nor separated by comma, e.g: 2021-11-02,2021-11-03 to retrieve merged events between these 2 dates)",
    commaSeparatedList
  );

const proceedCommand = (
  command: Command,
  commandParameters: (...args: any[]) => CommandParameters,
  repository: (token: string) => MergeEventRepository
) => {
  command
    .option(
      "-f, --format <writer>",
      "format to display the stats (default json in console), available formats are html, csv and console (default)",
      writer,
      new ConsoleWriter()
    )
    .action((...args: any[]) => {
      const parameters = commandParameters(...args);
      gitStatistics(parameters.requestParameters, repository(parameters.token))
        .then((stats) => {
          parameters.options.format.write(stats);
          ProgressBar.progressBar().clear();
        })
        .catch((reason: HTTPError | string | never) => {
          ProgressBar.progressBar().clear();
          const error = new chalk.chalk.Chalk().red;
          let errorMessage = reason;
          if (isHTTPError(reason)) {
            const additionalInfo = Object.entries(reason.additionalInfo as object).reduce(
              (accumulator, currentValue) => accumulator.concat(`- ${currentValue[0]}: ${currentValue[1]}\n\t`),
              ""
            );
            errorMessage = `${reason.rationale}.\nBelow are some additional information:\n\t${additionalInfo}`;
          }
          console.log(error(`Something wrong happened:\n${errorMessage}`));
        });
    });
};

proceedCommand(
  gitlabCommand,
  (token: string, projectId: number, period: Period, options) => ({
    requestParameters: {
      fromDate: period.start,
      projectId: projectId,
      toDate: period.end,
    } as MergeRequestsStatsParameters,
    options,
    token,
  }),
  (token: string) => new MergedRequestHTTPGitlabRepository(token)
);

proceedCommand(
  githubCommand,
  (token: string, owner: string, repo: string, period: Period, options) => ({
    requestParameters: {
      repo,
      owner,
      fromDate: period.start,
      toDate: period.end,
    } as PullRequestsStatsParameter,
    options,
    token,
  }),
  (token: string) => new PullRequestHTTPGithubRepository(token)
);

program.parse();
