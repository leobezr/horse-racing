import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const srcDir = path.join(rootDir, 'src')
const configDir = path.join(srcDir, 'config')
const typesDir = path.join(srcDir, 'types')
const allowedPrefixesPath = path.join(rootDir, '.opencode', 'allowed-data-test-prefixes.json')
const contextStatePath = path.join(rootDir, '.opencode', 'copilot-context.json')
const contextConfigPath = path.join(rootDir, '.opencode', 'copilot-contexts.json')
const srcAppDir = path.join(srcDir, 'app')

const errors = []

async function exists(targetPath) {
  try {
    await stat(targetPath)
    return true
  } catch {
    return false
  }
}

async function walk(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue
      }
      files.push(...(await walk(fullPath)))
      continue
    }
    files.push(fullPath)
  }
  return files
}

function isRelevantSource(filePath) {
  return /\.(vue|js|ts|jsx|tsx|mjs|cjs)$/.test(filePath)
}

function checkHardcodedConfig(filePath, content) {
  const envKeyRegex = /\b(API[_A-Z0-9]*|BASE_URL|ENDPOINT|TOKEN|SECRET|KEY|URL)\b\s*[:=]\s*['"][^'"]+['"]/g
  let match
  while ((match = envKeyRegex.exec(content))) {
    if (!filePath.includes(`${path.sep}config${path.sep}`)) {
      errors.push(`${filePath}: possible hard-coded config '${match[0]}' outside config module`)
    }
  }
}

function checkTypesSeparated(filePath, content) {
  const hasTypeDeclaration = /\b(type|interface)\b\s+[A-Z]/.test(content)
  const hasRuntimeLogic = /\b(function|const|let|class|if|for|while|switch|return)\b/.test(content)
  const inTypesDir = filePath.includes(`${path.sep}types${path.sep}`)
  if (hasTypeDeclaration && hasRuntimeLogic && !inTypesDir && !filePath.endsWith('.d.ts')) {
    errors.push(`${filePath}: mixed type definitions and runtime logic; move shared types to src/types`) 
  }
}

function checkBEMandDataTest(filePath, content, allowedPrefixes) {
  if (!filePath.endsWith('.vue')) {
    return
  }

  const classRegex = /class\s*=\s*"([^"]+)"/g
  let classMatch
  while ((classMatch = classRegex.exec(content))) {
    const classes = classMatch[1].split(/\s+/).filter(Boolean)
    for (const cls of classes) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?$/.test(cls)) {
        errors.push(`${filePath}: class '${cls}' does not follow BEM`)
      }
    }
  }

  const interactiveTagRegex = /<(button|a|input|select|textarea|form)\b[^>]*>/g
  let interactiveMatch
  while ((interactiveMatch = interactiveTagRegex.exec(content))) {
    const tag = interactiveMatch[0]
    if (!/\sdata-test\s*=\s*"[a-z0-9]+(?:-[a-z0-9]+)*"/.test(tag)) {
      errors.push(`${filePath}: interactive element missing data-test -> ${tag}`)
      continue
    }

    const dataTestMatch = tag.match(/data-test\s*=\s*"([a-z0-9]+(?:-[a-z0-9]+)*)"/)
    if (dataTestMatch) {
      const value = dataTestMatch[1]
      const prefix = value.split('-')[0]
      if (!allowedPrefixes.includes(prefix)) {
        errors.push(`${filePath}: data-test '${value}' prefix '${prefix}' not in allowed prefixes: ${allowedPrefixes.join(', ')}`)
      }
    }
  }
}

function countLogicalLines(content) {
  const lines = content.split('\n')
  const logical = lines.filter((line) => {
    const trimmed = line.trim()
    return trimmed.length > 0 && !trimmed.startsWith('//')
  })
  return logical.length
}

function checkFunctionLength(filePath, content) {
  if (!/\.(ts|vue)$/.test(filePath)) {
    return
  }

  const functionRegex = /(const\s+[A-Za-z0-9_$]+\s*=\s*\([^)]*\)\s*=>\s*\{|(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{|[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{)/g
  const lines = content.split('\n')
  let match

  while ((match = functionRegex.exec(content))) {
    const startIndex = match.index
    let braceDepth = 0
    let endIndex = -1
    for (let i = startIndex; i < content.length; i += 1) {
      const char = content[i]
      if (char === '{') {
        braceDepth += 1
      }
      if (char === '}') {
        braceDepth -= 1
        if (braceDepth === 0) {
          endIndex = i
          break
        }
      }
    }

    if (endIndex < 0) {
      continue
    }

    const beforeStart = content.slice(0, startIndex)
    const startLine = beforeStart.split('\n').length
    const body = content.slice(startIndex, endIndex + 1)
    const logicalLength = countLogicalLines(body)
    if (logicalLength > 30) {
      errors.push(`${filePath}:${startLine}: function length ${logicalLength} exceeds 30 logical lines`)
    }
  }

  if (lines.length === 0) {
    return
  }
}

function checkExportedJSDoc(filePath, content) {
  if (!/\.ts$/.test(filePath)) {
    return
  }

  const exportedFnRegex = /(^|\n)\s*export\s+(?:const\s+[A-Za-z0-9_$]+\s*=\s*\([^)]*\)\s*=>\s*\{|(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{)/g
  let match

  while ((match = exportedFnRegex.exec(content))) {
    const fullMatchIndex = match.index + (match[1] ? match[1].length : 0)
    const header = content.slice(0, fullMatchIndex).trimEnd()
    const jsDocMatch = /\/\*\*[\s\S]*\*\/$/.exec(header)
    const hasJsDoc = Boolean(jsDocMatch)
    if (!hasJsDoc) {
      const line = content.slice(0, fullMatchIndex).split('\n').length
      errors.push(`${filePath}:${line}: exported function is missing JSDoc`) 
      continue
    }

    const block = jsDocMatch ? jsDocMatch[0] : ''
    if (!/\b(why|because|reason|rationale|intent)\b/i.test(block)) {
      const line = content.slice(0, fullMatchIndex).split('\n').length
      errors.push(`${filePath}:${line}: JSDoc should explain why, not only what`) 
    }
  }
}

function checkEventCallbacksOutsideVue(filePath, content) {
  const normalizedAppPath = `${srcAppDir}${path.sep}`
  const isVueComponent = filePath.endsWith('.vue')
  const isUnderApp = filePath.startsWith(normalizedAppPath)
  if (isVueComponent && isUnderApp) {
    return
  }

  const callbackEventRegex = /(addEventListener\s*\(|\$on\s*\(|\.on\s*\(|\.once\s*\(|EventEmitter\b|mitt\s*\()/
  if (callbackEventRegex.test(content)) {
    errors.push(`${filePath}: event-driven callback usage is forbidden outside Vue components in src/app`)
  }
}

async function loadContextState() {
  const raw = await readFile(contextStatePath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!parsed || (parsed.current !== 'developer' && parsed.current !== 'orchestrator')) {
    throw new Error('copilot-context.json must define current as developer or orchestrator')
  }
  return parsed
}

async function loadContextConfig() {
  const raw = await readFile(contextConfigPath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!parsed?.developer || !parsed?.orchestrator) {
    throw new Error('copilot-contexts.json must define developer and orchestrator')
  }
  return parsed
}

async function loadAllowedPrefixes() {
  const raw = await readFile(allowedPrefixesPath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed.prefixes) || parsed.prefixes.length === 0) {
    throw new Error('allowed-data-test-prefixes.json must define non-empty prefixes array')
  }
  return parsed.prefixes
}

async function main() {
  const hasSrc = await exists(srcDir)
  if (!hasSrc) {
    errors.push('src directory not found')
  }

  if (!(await exists(configDir))) {
    errors.push('missing required config directory: src/config')
  }

  if (!(await exists(typesDir))) {
    errors.push('missing required types directory: src/types')
  }

  if (!(await exists(contextStatePath))) {
    errors.push('missing required context state file: .opencode/copilot-context.json')
  }

  if (!(await exists(contextConfigPath))) {
    errors.push('missing required context configuration file: .opencode/copilot-contexts.json')
  }

  const allowedPrefixes = await loadAllowedPrefixes()
  const contextState = await loadContextState()
  await loadContextConfig()
  if (hasSrc) {
    const allFiles = await walk(srcDir)
    const sourceFiles = allFiles.filter(isRelevantSource)
    for (const filePath of sourceFiles) {
      const content = await readFile(filePath, 'utf8')
      checkHardcodedConfig(filePath, content)
      checkTypesSeparated(filePath, content)
      checkBEMandDataTest(filePath, content, allowedPrefixes)
      if (contextState.current === 'developer') {
        checkFunctionLength(filePath, content)
        checkExportedJSDoc(filePath, content)
      }
      if (contextState.current === 'orchestrator') {
        checkEventCallbacksOutsideVue(filePath, content)
      }
    }
  }

  if (errors.length > 0) {
    console.error('Guardrails failed:')
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exitCode = 1
    return
  }

  console.log('Guardrails passed.')
}

main().catch((error) => {
  console.error('Guardrails execution error:', error)
  process.exitCode = 1
})
