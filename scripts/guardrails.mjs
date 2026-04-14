import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const srcDir = path.join(rootDir, 'src')
const configDir = path.join(srcDir, 'config')
const typesDir = path.join(srcDir, 'types')
const allowedPrefixesPath = path.join(rootDir, '.opencode', 'allowed-data-test-prefixes.json')

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

  const allowedPrefixes = await loadAllowedPrefixes()
  if (hasSrc) {
    const allFiles = await walk(srcDir)
    const sourceFiles = allFiles.filter(isRelevantSource)
    for (const filePath of sourceFiles) {
      const content = await readFile(filePath, 'utf8')
      checkHardcodedConfig(filePath, content)
      checkTypesSeparated(filePath, content)
      checkBEMandDataTest(filePath, content, allowedPrefixes)
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
