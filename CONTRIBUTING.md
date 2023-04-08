# Contributing

## Setup
**Prerequisites**
- Node v18.15
- **[Optional]** sass (`pm install -g sass`)

**Installation**
- Run `npm ci`
- Run `npm run build` will build the module in `./dist`
- **[Optional]** Run `sass templates/style.scss style.css` to build the stylesheet

**Execute**
You have 2 methods:
- **Using node:**
  - `node dist/index.js --help` will print:
    ```shell
    Usage: index [options] [command]
    
    Options:
    -h, --help                                        display help for command
    
    Commands:
    gitlab [options] <token> <projectId> <period>     Provide merge requests statistics on a gitlab project for a given period
    github [options] <token> <owner> <repo> <period>  Provide pull requests statistics on a github project for a given period
    help [command]                                    display help for command
    ```
- **Linking the module:**
  - Run `npm link`
  - Run `gitflows-stats --help` will print:
      ```shell
      Usage: index [options] [command]
      
      Options:
      -h, --help                                        display help for command
      
      Commands:
      gitlab [options] <token> <projectId> <period>     Provide merge requests statistics on a gitlab project for a given period
      github [options] <token> <owner> <repo> <period>  Provide pull requests statistics on a github project for a given period
      help [command]                                    display help for command
      ```
  - Don't forget to unlink the module when you're done `npm unlink`