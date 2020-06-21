import { ROOT_DIR, LOG_FULL_ERRORS } from './config.ts'

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
  for (const result of await Promise.allSettled(possibilities.map(async path => ({ path, stats: await Deno.stat(path) })))) {
    if (result.status === 'rejected') {
      continue
    }
    if (result.value.stats.isDirectory) {
      continue
    }
    const path = result.value.path
    const isInDir = path.replace(base, '').split('/').length === 2
    const resolved = {
      path: result.value.path,
      name: isInDir ? name : name.substring(0, name.lastIndexOf('.')),
      isInDir
    } as ResolvedTool
    resolutionCache[ cacheKey ] = resolved
    return resolved
  }
  throw new CLIError(ErrorNames.InvalidTool)
}

export const getAllTools = async function* (rootDir: string = ROOT_DIR) {
  for await (const { name } of Deno.readDir(TOOLS_DIR(rootDir))) {
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
