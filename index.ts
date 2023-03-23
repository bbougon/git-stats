import {program} from "commander";

program.command('mr')
    .description('Provide merge requests statistics for a given period')
    .argument('<token>', 'your gitlab API token')
    .argument('<projectId>', 'gitlab project id for which you want to have statistics')
    .argument('<period...>', 'the period you want to analyse (ISO formatted date separated by comma, e.g: 2021-11-02,2021-11-03)')
    .action((projectId, period, token) => {
        console.log(projectId, period, token);
    });

program.parse()