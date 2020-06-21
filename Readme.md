# Z CLI

## Running

When running from GitHub, you need to have the following env variables defined, this is to avoid rate limiting on the GitHub API.

These can also be provided by a JSON file in your current working directory (will be moved to a temp dir at some point).

### Env vars

- GITHUB_CLIENT_ID
- CITHUB_CLIENT_SECRET

### JSON file in cwd (will break at some point)

Filename: ```githubContent.json```

#### Note:
clientId and clientSecret are only needed to authenticate, so a valid accessToken can be provided instead of these.

```json
{
  "clientId": "",
  "clientSecret": "",
  "accessToken": ""
}

```

```deno run --allow-all cli/main.ts help```
```deno run --allow-all https://raw.githubusercontent.com/imzacm/z-cli/master/cli/main.ts help```
