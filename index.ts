import {program} from "commander";
import {mergeRequestsStats, MergeRequestStats} from "./src/merge-requests/MergeRequest.js";
import {MergedRequestHTTPGitlabRepository} from "./src/infrastructure/repository/MergeRequestHTTPGitlabRepository.js";
import {parseISO} from "date-fns";
import {ConsoleWriter} from "./src/infrastructure/writer/ConsoleWriter.js";
import {HTMLWriter} from "./src/infrastructure/writer/HTMLWriter.js";

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
    write(stats: MergeRequestStats): void
}

program.command('mr')
    .description('Provide merge requests statistics for a given period')
    .argument('<token>', 'your gitlab API token')
    .argument('<projectId>', 'gitlab project id for which you want to have statistics')
    .argument('<period>', 'the period you want to analyse (ISO formatted date separated by comma, e.g: 2021-11-02,2021-11-03)', commaSeparatedList)
    .option('-f, --format <writer>', 'format to display the stats (default json in console)', writer, new ConsoleWriter())
    .action((token, projectId, period, options) => {
        const requestParameter = {fromDate: parseISO(period[0]), projectId: projectId, toDate: parseISO(period[1])};
        mergeRequestsStats(requestParameter, new MergedRequestHTTPGitlabRepository(token))
            .then((stats) => {
                options.format.write(stats)
            })
    });

program.parse()