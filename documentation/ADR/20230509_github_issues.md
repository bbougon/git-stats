# 1. Github issues retrieval

**Date: 2023-05-09**

## Status

Adopted

## Context

GitHub API for repository issues considers pull requests as issues, see note below taken from [API documentation](https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#list-repository-issues)

```
Note: GitHub's REST API considers every pull request an issue, but not every issue is a pull request.
For this reason, "Issues" endpoints may return both issues and pull requests in the response.
You can identify pull requests by the pull_request key. Be aware that the id of a pull request returned from "Issues"
endpoints will be an issue id. To find out the pull request id, use the "List pull requests" endpoint.
```

## Decision

We remove pull requests returned by the API in order to get only issues
