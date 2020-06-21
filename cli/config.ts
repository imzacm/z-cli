export const LOG_FULL_ERRORS = true

export enum RunMode {
  Local,
  Network
}

export enum NetworkMode {
  None,
  Unknown,
  GitHub
}

const url = new URL('.', import.meta.url)

export const RUN_MODE = url.href.startsWith('http') ? RunMode.Network : RunMode.Local

const getNetworkMode = () => {
  if (RUN_MODE === RunMode.Local) {
    return NetworkMode.None
  }

  if (url.host === 'raw.githubusercontent.com') {
    return NetworkMode.GitHub
  }

  return NetworkMode.Unknown
}

export const NETWORK_MODE = getNetworkMode()

const getGithubInfo = () => {
  const [ , username, repo, branch, ...path ] = url.pathname.split('/')
  return {
    API_ROOT: `https://api.github.com/repos/${ username }/${ repo }/contents/`,
    API_QUERY: `ref=${ branch }`,
    USERNAME: username,
    REPO: repo,
    BRANCH: branch,
    BASE_PATH: `/${ path.join('/') }`
  }
}

export const GITHUB_INFO = NETWORK_MODE !== NetworkMode.GitHub ? null : getGithubInfo()

export const ROOT_DIR = `${ RUN_MODE === RunMode.Network ? url.origin : '' }${ url.pathname }`

console.log(url)
