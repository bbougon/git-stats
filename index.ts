import {program} from "commander";
import {mergeRequestsStats} from "./src/merge-requests/MergeRequest";
import {MergedRequestHTTPGitlabRepository} from "./src/infrastructure/repository/MergeRequestHTTPGitlabRepository";
import {parseISO} from "date-fns";

const commaSeparatedList =(list: string) => {
    return list.split(",")
}

program.command('mr')
    .description('Provide merge requests statistics for a given period')
    .argument('<token>', 'your gitlab API token')
    .argument('<projectId>', 'gitlab project id for which you want to have statistics')
    .argument('<period>', 'the period you want to analyse (ISO formatted date separated by comma, e.g: 2021-11-02,2021-11-03)', commaSeparatedList)
    .action((token, projectId, period) => {
        mergeRequestsStats({fromDate: parseISO(period[0]), projectId: projectId, toDate: parseISO(period[1])}, new MergedRequestHTTPGitlabRepository(token))
            .then((stats) => {
                console.log(JSON.stringify(stats.result(), null, 2))
            })
    });

program.parse()