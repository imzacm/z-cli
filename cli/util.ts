import { ROOT_DIR, LOG_FULL_ERRORS, RUN_MODE, RunMode, NETWORK_MODE, NetworkMode, GITHUB_INFO } from './config.ts'
import { makeGithubApiRequest } from './githubApi.ts'

const TOOLS_DIR = (rootDir: string) => `${ rootDir.endsWith('/') ? rootDir.substring(0, rootDir.length - 1) : rootDir }/tools/`

export const ErrorNames = {
  InvalidTool: Symbol('InvalidTool'),
  UnhandledError: Symbol('UnhandledError')
}

const ErrorNameToMessage: any = {
  [ ErrorNames.InvalidTool ]: 'Invalid tool'
}

export class CLIError extends Error {
  public readonly swallowedError: Error | undefined
  public readonly symbol: symbol

  public constructor(name: symbol | Error) {
    let swallowedError: Error | undefined
    if (name instanceof Error) {
      swallowedError = name
      name = ErrorNames.UnhandledError
    }
    super(ErrorNameToMessage[ name ])
    this.symbol = name
    this.swallowedError = swallowedError
    this.name = name.description as string
  }

  public toString() {
    if (LOG_FULL_ERRORS) {
      return this.swallowedError?.toString() ?? Error.prototype.toString.apply(this)
    }
    return `${ this.name }
${ this.swallowedError?.message ?? this.message }`
  }
}

export type ResolvedTool = {
  path: string
  name: string
  isInDir: boolean
}

const resolutionCache: { [ key: string ]: ResolvedTool } = {}

const getGithubFiles = async (path: string) => {
  if (NETWORK_MODE !== NetworkMode.GitHub || !GITHUB_INFO) {
    return null
  }
  const start = path.indexOf(GITHUB_INFO.BASE_PATH)
  const newPath = path.substring(start + GITHUB_INFO.BASE_PATH.length)
  const response = await makeGithubApiRequest(`${ newPath }?${ GITHUB_INFO.API_QUERY }`)
  const array = !Array.isArray(response) ? [ response ] : response
  return array.map(r => r.name).filter(n => !!n)
}

const isFile = async (path: string) => {
  if (RUN_MODE === RunMode.Local) {
    try {
      const stats = await Deno.stat(path)
      return !stats.isDirectory
    }
    catch {
      return false
    }
  }
  const githubFiles = await getGithubFiles(path)
  console.log({ path, githubFiles })
  return (githubFiles || []).length > 0
}

export const resolveTool = async (name: string, rootDir: string) => {
  const cacheKey = `${ rootDir }${ name }`
  if (resolutionCache[ cacheKey ]) {
    return resolutionCache[ cacheKey ]
  }
  const toolsDir = TOOLS_DIR(rootDir)
  const base = `${ toolsDir }${ name }`
  const possibilities = [
    base,
    `${ base }.js`,
    `${ base }.ts`,
    `${ base }/main.js`,
    `${ base }/main.ts`
  ]
  for (const path of possibilities) {
    if (!(await isFile(path))) {
      continue
    }
    const isInDir = path.replace(base, '').split('/').length === 2
    const resolved = {
      path,
      name: isInDir ? name : name.substring(0, name.lastIndexOf('.')),
      isInDir
    } as ResolvedTool
    resolutionCache[ cacheKey ] = resolved
    return resolved
  }
  throw new CLIError(ErrorNames.InvalidTool)
}

const readDir = async function* (path: string) {
  if (RUN_MODE === RunMode.Local) {
    yield* Deno.readDir(path)
    return
  }
  const gitHubFiles = await getGithubFiles(path)
  if (gitHubFiles) {
    yield* gitHubFiles
  }
}

export const getAllTools = async function* (rootDir: string = ROOT_DIR) {
  for await (const { name } of readDir(TOOLS_DIR(rootDir))) {
    if (!name) {
      continue
    }
    yield await resolveTool(name, rootDir)
  }
}

export type Tool = {
  exec: (...args: string[]) => Promise<void>
  getHelp: (...args: string[]) => Promise<string>
}

export const loadTool = async (name: string, rootDir: string = ROOT_DIR) => {
  const { path } = await resolveTool(name, rootDir)
  const tool: Tool = await import(path)
  return tool
}
