import {Command, program} from "commander";
import {
    MergeEventRepository,
    mergeEventsStatistics,
    GitStatistics
} from "./src/merge-events/MergeEvents.js";
import {MergedRequestHTTPGitlabRepository} from "./src/infrastructure/repository/MergeRequestHTTPGitlabRepository.js";
import {parseISO} from "date-fns";
import {ConsoleWriter} from "./src/infrastructure/writer/ConsoleWriter.js";
import {HTMLWriter} from "./src/infrastructure/writer/HTMLWriter.js";
import {MergeRequestsStatsParameters} from "./src/merge-events/Gitlab.js";
import {PullRequestHTTPGithubRepository} from "./src/infrastructure/repository/PullRequestHTTPGithubRepository.js";
import {PullRequestsStatsParameter} from "./src/merge-events/Github.js";

const commaSeparatedList =(list: string) => {
    return list.split(",")
}

const writer = (format: string): Writer => {
    if (format === 'html'){
        return new HTMLWriter("./")
    }
    return new ConsoleWriter()
}

export interface Writer {
    write(stats: GitStatistics): void
}
export type RequestParameters = {
    fromDate: Date;
    toDate: Date;
}
type CommandParameters = {
    requestParameters: RequestParameters,
    options: any,
    token: string
}

const gitlabCommand = program.command('gitlab')
    .description('Provide merge requests statistics on a gitlab project for a given period')
    .argument('<token>', 'your gitlab API token')
    .argument('<projectId>', 'gitlab project id for which you want to have statistics')
    .argument('<period>', 'the period you want to analyse (ISO formatted date separated by comma, e.g: 2021-11-02,2021-11-03)', commaSeparatedList);

const githubCommand = program.command('github')
    .description('Provide pull requests statistics on a github project for a given period')
    .argument('<token>', 'your github API token')
    .argument('<owner>', 'The account owner of the repository. The name is not case sensitive')
    .argument('<repo>', 'The name of the repository. The name is not case sensitive.')
    .argument('<period>', 'the period you want to analyse (ISO formatted date separated by comma, e.g: 2021-11-02,2021-11-03)', commaSeparatedList);


const proceedCommand = (command: Command, commandParameters: (...args: any[]) => CommandParameters, repository: (token: string) => MergeEventRepository) => {
    command
        .option('-f, --format <writer>', 'format to display the stats (default json in console)', writer, new ConsoleWriter())
        .action((...args: any[]) => {
            const parameters = commandParameters(...args)
            mergeEventsStatistics(parameters.requestParameters, repository(parameters.token))
                .then((stats) => {
                    parameters.options.format.write(stats)
                })
        });
}

proceedCommand(gitlabCommand, (token: string, projectId: number, period: string[], options) => ({
    requestParameters: {
        fromDate: parseISO(period[0]),
        projectId: projectId,
        toDate: parseISO(period[1])
    } as MergeRequestsStatsParameters, options, token
}), (token: string) => new MergedRequestHTTPGitlabRepository(token));

proceedCommand(githubCommand, (token: string, owner: string, repo: string, period: string[], options) => ({
    requestParameters: {
        repo,
        owner,
        fromDate: parseISO(period[0]),
        toDate: parseISO(period[1])
    } as PullRequestsStatsParameter, options, token
}), (token: string) => new PullRequestHTTPGithubRepository(token));

program.parse()