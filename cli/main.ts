import { loadTool, Tool, CLIError, ErrorNames } from './util.ts'

const mainTool: Tool = {
  exec: async (tool, ...args) => {
    if (!tool) {
      throw new CLIError(ErrorNames.InvalidTool)
    }
    const { getHelp, exec } = await loadTool(tool)

    // If second arg is help, run help
    if (args[ 0 ] === 'help') {
      const helpText = await getHelp(...args)
      console.log(helpText)
      return
    }
    await exec(...args)
  },
  // Should never be called
  getHelp: async () => { throw new Error('main getHelp was called which should never happen') }
}

let recursiveLoop = false
const run = async (...args: string[]) => {
  try {
    await mainTool.exec(...args)
  }
  catch (error) {
    if (!recursiveLoop && (error as CLIError).symbol === ErrorNames.InvalidTool) {
      console.error('Invalid tool')
      recursiveLoop = true
      await run('help')
      return
    }
    console.error(error)
    Deno.exit(1)
  }
}

await run(...Deno.args)
