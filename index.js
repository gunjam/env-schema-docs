#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { arch, platform } from 'node:os'
import { join, isAbsolute } from 'node:path'
import { parseArgs, parseEnv, styleText } from 'node:util'
import Ajv from 'ajv'
import meta from './package.json' with { type: 'json' }

const COMMENT_LINE_LENGTH = 80
const bold = (string) => styleText('bold', string)

export const help = `\
Generate environment variable docs from a JSON schema

${bold('VERSION')}
  ${meta.name}/${meta.version} ${platform()}-${arch()} node-${process.version}

${bold('USAGE')}
  $ envdocs [COMMAND]

${bold('COMMANDS')}
  help     Display help for envdocs or an envdocs command
  readme   Inject a markdown table of environment variables into a readme file
  dotenv   Generate or update a dotenv file
`

export const helpReadme = `\
Inject a markdown table of environment variables into a readme file

${bold('USAGE')}
  $ envdocs readme SCHEMAPATH READMEPATH

${bold('ARGUMENTS')}
  SCHEMAPATH  The path to the JSON schema, either a JSON file or a JS file that
              exports a schema as the default value or a name export of "schema"
  READMEPATH  The path to the readme file

${bold('DESCRIPTION')}
  Inject a markdown table of environment variables into a readme file. The table
  will appear between the "<!-- ENV_VARS_START -->" and "<!-- ENV_VARS_END -->"
  comments within the file.

${bold('EXAMPLES')}
  $ envdocs readme ./schemas/env.json ./README.md
`

export const helpDotenv = `\
Generate or update a dotenv file

${bold('USAGE')}
  $ envdocs dotenv SCHEMAPATH DOTENVPATH [-c] [-d] [-u]

${bold('ARGUMENTS')}
  SCHEMAPATH  The path to the JSON schema, either a JSON file or a JS file that
              exports a schema as the default value or a name export of "schema"
  READMEPATH  The path to the dotenv file

${bold('FLAGS')}
  -c, --comments  Comment each variable with the schema description
  -d, --defaults  Set the schema defaults as the variable values
  -u, --update    If the file already exists, preserve variable values

${bold('DESCRIPTION')}
  Generate or update a dotenv file

${bold('EXAMPLES')}
  $ envdocs dotenv ./schemas/env.json ./.env.example -c -d
  $ envdocs dotenv ./schemas/env.json ./.env -u
`

function buildRow (row, widths) {
  let str = '|'
  for (let i = 0; i < row.length; i++) {
    str += ` ${row[i].padEnd(widths[i], ' ')} |`
  }
  return str + '\n'
}

export function buildTable (envSchema) {
  // No vars in schema
  if (typeof envSchema?.properties !== 'object' ||
    envSchema.properties === null ||
    Object.keys(envSchema.properties).length === 0
  ) {
    return ''
  }

  const rows = [['Name', 'Description', 'Default', 'Required']]
  const widths = rows[0].map((col) => col.length)

  for (const [varName, varSchema] of Object.entries(envSchema.properties)) {
    const row = [
      varName,
      varSchema.description ?? '',
      varSchema.default ? String(varSchema.default) : '',
      envSchema.required?.includes(varName) ? 'Yes' : 'No',
    ]

    for (let i = 0; i < widths.length; i++) {
      if (row[i].length > widths[i]) widths[i] = row[i].length
    }

    rows.push(row)
  }

  const divider = widths.map((w) => '-'.repeat(w))
  let table = buildRow(rows[0], widths)
  table += buildRow(divider, widths)

  for (let i = 1; i < rows.length; i++) {
    table += buildRow(rows[i], widths)
  }

  return table.trim()
}

export function buildEnvFile (envSchema, comments, defaults, existing) {
  let dotEnv = ''

  // No vars in schema
  if (typeof envSchema?.properties !== 'object' ||
    envSchema.properties === null ||
    Object.keys(envSchema.properties).length === 0
  ) {
    return dotEnv
  }

  for (const [varName, varSchema] of Object.entries(envSchema.properties)) {
    if (comments) {
      const required = envSchema.required?.includes(varName)
      let start = 0
      dotEnv += '\n'

      while (varSchema.description?.[start]) {
        let end = start + COMMENT_LINE_LENGTH - 2
        if (end < varSchema.description.length &&
          varSchema.description[end] !== ' ' &&
          varSchema.description[end + 1] !== ' ') {
          end = varSchema.description.lastIndexOf(' ', end)
        }
        const line = varSchema.description.slice(start, end)
        dotEnv += `# ${line.trim()}\n`
        start = end
      }

      if (varSchema.default || required) {
        const d = varSchema.default ? `Default: ${varSchema.default}` : ''
        dotEnv += `# ${required ? `Required${d ? '. ' : ''}` : ''}${d}\n`
      }
    }
    const defaultValue = defaults ? varSchema.default : undefined
    const value = existing?.[varName] ?? defaultValue
    dotEnv += `${varName}=${value ? JSON.stringify(value) : ''}\n`
  }

  return dotEnv.trim() + '\n'
}

function getAbsolutePath (path, name) {
  if (!path) {
    throw new Error(`No ${name} file path provided`)
  }
  return isAbsolute(path) ? path : join(process.cwd(), path)
}

async function loadSchema (path) {
  const schema = await import(path)
    .catch(() => import(path, { with: { type: 'json' } }))
    .then((s) => (typeof s.default === 'object' ? s.default : s.schema))
    .catch((cause) => {
      if (cause.code === 'ERR_MODULE_NOT_FOUND') {
        return Promise.reject(new Error(`Schema file not found at path: ${path}`))
      }
      return Promise.reject(new Error('Failed to load schema', { cause }))
    })

  try {
    new Ajv().validateSchema(schema, true)
  } catch (err) {
    throw new Error('Schema invalid', { cause: err })
  }

  return schema
}

async function dotEnvCommand () {
  const { positionals, values: { comments, update, defaults } } = parseArgs({
    allowPositionals: true,
    options: {
      update: {
        type: 'boolean',
        short: 'u',
        default: false,
      },
      comments: {
        type: 'boolean',
        short: 'c',
        default: false,
      },
      defaults: {
        type: 'boolean',
        short: 'd',
        default: false,
      },
    },
  })

  const schemaPath = getAbsolutePath(positionals[1], 'schema')
  const dotenvPath = getAbsolutePath(positionals[2], 'dotenv')
  const schema = await loadSchema(schemaPath)
  let existing = {}
  if (update) {
    let envdata
    try {
      envdata = readFileSync(dotenvPath, 'utf8')
      existing = parseEnv(envdata)
    } catch (cause) {
      // If the file doesn't exist just create it
      if (cause.code !== 'ERR_MODULE_NOT_FOUND') {
        throw new Error('Failed load to dotenv file', { cause })
      }
    }
  }
  const updated = buildEnvFile(schema, comments, defaults, existing)
  try {
    writeFileSync(dotenvPath, updated)
  } catch (cause) /* node:coverage ignore next 2 */ {
    throw new Error('Failed to write changes to dotenv file', { cause })
  }
}

async function readmeCommand () {
  const commentPattern = /\n?<!--\s*ENV_VARS_START[\s\S]+ENV_VARS_END\s*-->\n?/
  const { positionals } = parseArgs({ allowPositionals: true })
  const schemaPath = getAbsolutePath(positionals[1], 'schema')
  const readmePath = getAbsolutePath(positionals[2], 'readme')
  const schema = await loadSchema(schemaPath)
  const table = buildTable(schema)
  let readme
  try {
    readme = readFileSync(readmePath, 'utf-8')
  } catch (cause) {
    if (cause.code !== 'ERR_MODULE_NOT_FOUND') {
      throw new Error(`Readme file not found at ${readmePath}`)
    }
    throw new Error('Failed to load readme', { cause })
  }
  if (!commentPattern.test(readme)) {
    throw new Error('No ENV_VARS_START and/or ENV_VARS_END comments in readme')
  }
  try {
    const updated = readme.replace(
      commentPattern,
      `\n<!-- ENV_VARS_START -->\n${table}\n<!-- ENV_VARS_END -->\n`
    )
    writeFileSync(readmePath, updated)
  } catch (cause) /* node:coverage ignore next 2 */ {
    throw new Error('Failed to write changes to readme', { cause })
  }
}

function helpCommand () {
  const [, command] = parseArgs({ allowPositionals: true }).positionals

  if (command === 'dotenv') {
    console.log(helpDotenv)
  } else if (command === 'readme') {
    console.log(helpReadme)
  } else if (command === 'help') {
    console.log(help)
  } else if (command === undefined) {
    console.log(help)
  } else {
    throw new Error(`Invalid command "${command}"`)
  }
}

if (import.meta.main) {
  try {
    const command = process.argv.at(2)

    if (command === 'dotenv') {
      await dotEnvCommand()
    } else if (command === 'readme') {
      await readmeCommand()
    } else if (command === 'help' || command === undefined) {
      helpCommand()
    } else {
      throw new Error(`Invalid command "${command}"`)
    }
  } catch (err) {
    const cause = err.cause ? `\n${err.cause.message}` : ''
    console.error(`Error: ${err.message}${cause}`)
  }
}
