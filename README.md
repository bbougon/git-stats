# Gitlab stats

Provide statistics usage of your gitlab/github projects

## Setup
**Prerequisites**
- Node v18.15
- **[Optional]** sass (`pm install -g sass`)

**Installation**
- Run `npm run build` will build the module in `./dist` 
- **[Optional]** Run `sass templates/style.scss style.css` to build the stylesheet

## Usage
- `npm dist/index.js --help` will print:
  ```shell
  Usage: index [options] [command]
  
  Options:
  -h, --help                                        display help for command
  
  Commands:
  gitlab [options] <token> <projectId> <period>     Provide merge requests statistics on a gitlab project for a given period
  github [options] <token> <owner> <repo> <period>  Provide pull requests statistics on a github project for a given period
  help [command]                                    display help for command
  ```
- `node dist/index.js gitlab <TOKEN> <PROJECT_ID> <PERIOD>` (<PERIOD> in the following format `2023-01-01,2023-01-31`) will print:
  ```json
  {
    "average": {
      "days": 3.79,
      "hours": 90.84
  },
    "total": {
      "merged": 58,
      "closed": 14,
      "opened": 6,
      "all": 78
    }
  }
  ```
- ` node dist/index.js gitlab <TOKEN> <PROJECT_ID> <PERIOD> --format html` (<PERIOD> in the following format `2023-01-01,2023-01-31`) will generate an `index.html` in the root project that will automatically open after generation.

  **example:**
  ![](documentation/chart_screenshot.png)