import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const CONTEXTS = new Set(['developer', 'orchestrator'])
const rootDir = process.cwd()
const opencodeDir = path.join(rootDir, '.opencode')
const contextFile = path.join(opencodeDir, 'copilot-context.json')

const toJson = (value) => {
  return `${JSON.stringify(value, null, 2)}\n`
}

const readContext = async () => {
  const raw = await readFile(contextFile, 'utf8')
  return JSON.parse(raw)
}

const writeContext = async (context, reason) => {
  await mkdir(opencodeDir, { recursive: true })
  const payload = {
    current: context,
    reason,
    updatedAt: new Date().toISOString(),
  }
  await writeFile(contextFile, toJson(payload), 'utf8')
  return payload
}

const printUsage = () => {
  console.log('Usage: yarn context:set <developer|orchestrator> [reason]')
  console.log('       yarn context:get')
}

const run = async () => {
  const [, , command, contextArg, ...reasonParts] = process.argv

  if (command === 'set') {
    const context = contextArg?.trim()
    if (!context || !CONTEXTS.has(context)) {
      console.error('Invalid context. Expected developer or orchestrator.')
      printUsage()
      process.exitCode = 1
      return
    }

    const reason = reasonParts.join(' ').trim() || 'manual'
    const payload = await writeContext(context, reason)
    console.log(`context=${payload.current}`)
    console.log(`reason=${payload.reason}`)
    console.log(`updatedAt=${payload.updatedAt}`)
    return
  }

  if (command === 'get') {
    const payload = await readContext()
    console.log(toJson(payload).trim())
    return
  }

  printUsage()
  process.exitCode = 1
}

run().catch((error) => {
  console.error('Context switcher failed:', error)
  process.exitCode = 1
})
