import { getAllTools, loadTool, resolveTool } from '../util.ts'
import { ROOT_DIR } from '../config.ts'

export const getHelp = async (tool?: string, ...args: string[]) => {
  let helpText = ''
  const toolIterator = tool ? [ await resolveTool(tool, ROOT_DIR) ] : getAllTools(ROOT_DIR)
  for await (const { name } of toolIterator) {
    if (!name || name === 'help') {
      continue
    }
    const { getHelp } = await loadTool(name)
    helpText = `${ helpText }${ name } - ${ await getHelp() }
`
  }
  return `Z CLI Help
To see detailed help for a subcommand, run "<subcommand> help" or "help <subcommand>"
${ helpText }`
}

export const exec = async (...args: string[]) => {
  console.log(await getHelp(...args))
}
