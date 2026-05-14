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

/**
 * Get abosolute path for a given file path
 * @param {string} path File path, relative or absolute
 * @param {string} name Type of file
 * @returns {string} absolute file path
 */
function getAbsolutePath (path, type) {
  if (!path) throw new Error(`No ${type} file path provided`)
  return isAbsolute(path) ? path : join(process.cwd(), path)
}

/**
 * Check if a given JSON schema object actually has any properties in it
 * @param {JSONSchema} schema A schema object
 * @returns {boolean} true if there are properties
 */
function schemaHasProperties (schema) {
  const p = schema?.properties
  return typeof p === 'object' && p !== null && Object.keys(p).length !== 0
}

/**
 * Build an individual table row
 * @param {string[]} row A row of column values
 * @param {int[]} widths A list of column widths so strings can be padded
 * @returns {string} the rendered row
 */
function buildRow (row, widths) {
  let str = '|'
  for (let i = 0; i < row.length; i++) {
    str += ` ${row[i].padEnd(widths[i], ' ')} |`
  }
  return str + '\n'
}

/**
 * Build a table of environment variables from a JSON schema representation
 * @param {JSONSchema} envSchema The JSON schema
 * @returns {string} the rendered table
 */
export function buildTable (envSchema) {
  if (!schemaHasProperties(envSchema)) {
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

/**
 * Build a dotenv file of environment variables from a JSON schema
 * @param {JSONSchema} envSchema The JSON schema
 * @param {boolean} [comments] Whether to add comments from property description
 * @param {boolean} [defaults] Use schema default values as env var vaules
 * @param {Record<string, string>} [values] Values to use for the env vars
 * @returns {string} the rendered dotenv file content
 */
export function buildEnvFile (envSchema, comments, defaults, values) {
  if (!schemaHasProperties(envSchema)) {
    return ''
  }
  let dotEnv = ''

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
    const value = values?.[varName] ?? defaultValue
    dotEnv += `${varName}=${value ? JSON.stringify(value) : ''}\n`
  }

  return dotEnv.trim() + '\n'
}

/**
 * Load a text file from disc
 * @param {string} path The path to the file
 * @param {string} type The type of file it is
 * @returns {string} the file content
 */
function loadFile (path, type) {
  const absolutePath = getAbsolutePath(path, type)
  try {
    return readFileSync(absolutePath, 'utf-8')
  } catch (cause) {
    if (cause.code !== 'ERR_MODULE_NOT_FOUND') {
      throw new Error(`${type} file not found at ${absolutePath}`)
    }
    throw new Error(`Failed to load ${type}`, { cause })
  }
}

/**
 * Write a text file to disc
 * @param {string} path The path to the file
 * @param {string} content The file content
 * @param {string} type The type of file it is
 */
function writeFile (path, content, type) {
  const absolutePath = getAbsolutePath(path, type)
  try {
    writeFileSync(absolutePath, content, 'utf-8')
  } catch (cause) /* node:coverage ignore next 2 */ {
    throw new Error(`Failed to write to ${type} file`, { cause })
  }
}

/**
 * Load a JSON schema from disc, either from as a JavaScript object exported as
 * default or named "schema", or from a JSON file.
 * @param {string} path The path to the file
 * @returns {Promise<JSONSchema>} the JSON schema
 */
async function loadSchema (path) {
  const absolutePath = getAbsolutePath(path, 'schema')
  const schema = await import(absolutePath)
    .catch(() => import(absolutePath, { with: { type: 'json' } }))
    .then((s) => (typeof s.default === 'object' ? s.default : s.schema))
    .catch((cause) => {
      if (cause.code === 'ERR_MODULE_NOT_FOUND') {
        const error = new Error(`Schema file not found at path: ${absolutePath}`)
        return Promise.reject(error)
      }
      return Promise.reject(new Error('Failed to load schema', { cause }))
    })

  try {
    new Ajv({ $data: true }).validateSchema(schema, true)
  } catch (err) {
    throw new Error('Schema invalid', { cause: err })
  }

  return schema
}

/**
 * Execute the dotenv command, load the schema, build a new dotenv file and
 * write it to disc.
 */
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

  const [, schemaPath, dotenvPath] = positionals
  const schema = await loadSchema(schemaPath)
  const existing = update ? parseEnv(loadFile(dotenvPath, 'dotenv')) : {}
  const updated = buildEnvFile(schema, comments, defaults, existing)
  writeFile(dotenvPath, updated, 'dotenv')
}

/**
 * Execute the readme command, load the schema, build an env var table and
 * inject it into a readme file.
 */
async function readmeCommand () {
  const commentPattern = /\n?<!--\s*ENV_VARS_START[\s\S]+ENV_VARS_END\s*-->\n?/
  const { positionals: [, schemaPath, readmePath] } = parseArgs({ allowPositionals: true })
  const schema = await loadSchema(schemaPath)
  const table = buildTable(schema)
  const readme = loadFile(readmePath, 'readme')
  if (!commentPattern.test(readme)) {
    throw new Error('No ENV_VARS_START and/or ENV_VARS_END comments in readme')
  }
  const updated = readme.replace(
    commentPattern,
    `\n<!-- ENV_VARS_START -->\n${table}\n<!-- ENV_VARS_END -->\n`
  )
  writeFile(readmePath, updated, 'readme')
}

/**
 * Execute the readme command, display generic or command specific help content
 */
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

/** @typedef {import("@types/json-schema").JSONSchema7} JSONSchema */
