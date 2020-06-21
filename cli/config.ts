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

export const GITHUB_API_ROOT = NETWORK_MODE !== NetworkMode.GitHub ? '' : `https://api.github.com/repos${ url.pathname }`

export const ROOT_DIR = `${ RUN_MODE === RunMode.Network ? url.origin : '' }${ url.pathname }`

console.log(url)
