export const LOG_FULL_ERRORS = true

export enum RunMode {
  Local,
  Network
}

export const RUN_MODE = import.meta.url.startsWith('http') ? RunMode.Network : RunMode.Local

const url = new URL('.', import.meta.url)

export const ROOT_DIR = `${ RUN_MODE === RunMode.Network ? url.origin : '' }${ url.pathname }`

console.log(url)
