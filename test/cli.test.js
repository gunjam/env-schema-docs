import { equal } from 'node:assert/strict'
import { join, relative } from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { help, helpDotenv, helpReadme } from '../index.js'

const cliPath = join(import.meta.dirname, '../index.js')
const exec = promisify((await import('node:child_process')).exec)
const tmpDir = tmpdir()

let tmp

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpDir, 'cli-'))
})

afterEach(async () => rm(tmp, { recursive: true }))

test('dotenv creates .env file from JSON schema', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )

  const dotenvPath = join(tmp, '.env')
  await exec(`node ${cliPath} dotenv ${schemaPath} ${dotenvPath}`)
  equal(
    await readFile(dotenvPath, 'utf-8'),
    'VAR_1=\n'
  )
})

test('dotenv creates .env file with comments', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    `{
       "properties": {
         "VAR_1": {
           "description": "Description",
           "type": "string"
         }
       }
     }`
  )

  const dotenvPath = join(tmp, '.env')
  await exec(`node ${cliPath} dotenv ${schemaPath} ${dotenvPath} --comments`)
  equal(await readFile(dotenvPath, 'utf-8'), '# Description\nVAR_1=\n')
})

test('dotenv creates .env file with comments (short flag)', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    `{
       "properties": {
         "VAR_1": {
           "description": "Description",
           "type": "string"
         }
       }
     }`
  )

  const dotenvPath = join(tmp, '.env')
  await exec(`node ${cliPath} dotenv ${schemaPath} ${dotenvPath} -c`)
  equal(await readFile(dotenvPath, 'utf-8'), '# Description\nVAR_1=\n')
})

test('dotenv creates .env file with defaults as values', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    `{
       "properties": {
         "VAR_1": {
           "default": "test",
           "type": "string"
         }
       }
     }`
  )

  const dotenvPath = join(tmp, '.env')
  await exec(`node ${cliPath} dotenv ${schemaPath} ${dotenvPath} --defaults`)
  equal(await readFile(dotenvPath, 'utf-8'), 'VAR_1="test"\n')
})

test('dotenv creates .env file with defaults as values (short flag)', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    `{
       "properties": {
         "VAR_1": {
           "default": "test",
           "type": "string"
         }
       }
     }`
  )

  const dotenvPath = join(tmp, '.env')
  await exec(`node ${cliPath} dotenv ${schemaPath} ${dotenvPath} -d`)
  equal(await readFile(dotenvPath, 'utf-8'), 'VAR_1="test"\n')
})

test('dotenv updates existing .env file with preserving existing values', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    `{
       "properties": {
         "VAR_1": {
           "type": "string"
         },
         "VAR_2": {
           "type": "string"
         }
       }
     }`
  )

  const dotenvPath = join(tmp, '.env')
  await writeFile(dotenvPath, 'VAR_1="Existing"\n')

  await exec(`node ${cliPath} dotenv ${schemaPath} ${dotenvPath} --update`)
  equal(await readFile(dotenvPath, 'utf-8'), 'VAR_1="Existing"\nVAR_2=\n')
})

test('dotenv can read and write with relative paths', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    `{
       "properties": {
         "VAR_1": {
           "type": "string"
         },
         "VAR_2": {
           "type": "string"
         }
       }
     }`
  )

  const dotenvPath = join(tmp, '.env')
  await writeFile(dotenvPath, 'VAR_1="Existing"\n')

  const cwd = process.cwd()
  const relSchemaPath = relative(cwd, schemaPath)
  const relDotenvPath = relative(cwd, dotenvPath)
  await exec(`node ${cliPath} dotenv ${relSchemaPath} ${relDotenvPath} --update`)
  equal(await readFile(dotenvPath, 'utf-8'), 'VAR_1="Existing"\nVAR_2=\n')
})

test('dotenv updates existing .env file with preserving existing values (short flag)', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    `{
       "properties": {
         "VAR_1": {
           "type": "string"
         },
         "VAR_2": {
           "type": "string"
         }
       }
     }`
  )

  const dotenvPath = join(tmp, '.env')
  await writeFile(dotenvPath, 'VAR_1="Existing"\n')

  await exec(`node ${cliPath} dotenv ${schemaPath} ${dotenvPath} -u`)
  equal(await readFile(dotenvPath, 'utf-8'), 'VAR_1="Existing"\nVAR_2=\n')
})

test('dotenv errors if missing .env path', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )

  const { stderr } = await exec(`node ${cliPath} dotenv ${schemaPath}`)
  equal(stderr, 'Error: No dotenv file path provided\n')
})

test('dotenv errors if .env file is missing on update', async () => {
  const schemaPath = join(tmp, 'schema.json')
  const dotenvPath = join(tmp, '.env')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )

  const { stderr } = await exec(`node ${cliPath} dotenv ${schemaPath} ${dotenvPath} -u`)
  equal(stderr, `Error: dotenv file not found at ${dotenvPath}\n`)
})

test('dotenv errors if missing JSON schema path', async () => {
  const { stderr } = await exec(`node ${cliPath} dotenv`)
  equal(stderr, 'Error: No schema file path provided\n')
})

test('dotenv errors if schema is invalid', async () => {
  const schemaPath = join(tmp, 'schema.json')
  const dotenvPath = join(tmp, '.env')
  await writeFile(schemaPath, '"invalid"')

  const { stderr } = await exec(`node ${cliPath} dotenv ${schemaPath} ${dotenvPath}`)
  equal(stderr, `Error: Schema invalid
Cannot read properties of undefined (reading '$schema')
`)
})

test('dotenv errors if schema is missing', async () => {
  const schemaPath = join(tmp, 'schema.json')
  const dotenvPath = join(tmp, '.env')

  const { stderr } = await exec(`node ${cliPath} dotenv ${schemaPath} ${dotenvPath}`)
  equal(stderr, `Error: Schema file not found at path: ${schemaPath}\n`)
})

test('readme injects table from JSON schema', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )

  const readmePath = join(tmp, 'inject.md')
  await writeFile(
    readmePath,
    `# Env vars
<!-- ENV_VARS_START -->
<!-- ENV_VARS_END -->
`
  )

  await exec(`node ${cliPath} readme ${schemaPath} ${readmePath}`)
  equal(
    await readFile(readmePath, 'utf-8'),
    `# Env vars
<!-- ENV_VARS_START -->
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 |             |         | No       |
<!-- ENV_VARS_END -->
`
  )
})

test('readme injects table from JS schema', async () => {
  const schemaPath = join(tmp, 'schema.js')
  await writeFile(
    schemaPath,
    'export default { properties: { VAR_1: { type: "string" } } };'
  )

  const readmePath = join(tmp, 'inject.md')
  await writeFile(
    readmePath,
    `# Env vars
<!-- ENV_VARS_START -->
<!-- ENV_VARS_END -->
`
  )

  await exec(`node ${cliPath} readme ${schemaPath} ${readmePath}`)
  equal(
    await readFile(readmePath, 'utf-8'),
    `# Env vars
<!-- ENV_VARS_START -->
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 |             |         | No       |
<!-- ENV_VARS_END -->
`
  )
})

test('readme injects table from JS named export schema', async () => {
  const schemaPath = join(tmp, 'schema.mjs')
  await writeFile(
    schemaPath,
    'export const schema = { properties: { VAR_1: { type: "string" } } }'
  )

  const readmePath = join(tmp, 'inject.md')
  await writeFile(
    readmePath,
    `# Env vars
<!-- ENV_VARS_START -->
<!-- ENV_VARS_END -->
`
  )

  await exec(`node ${cliPath} readme ${schemaPath} ${readmePath}`)
  equal(
    await readFile(readmePath, 'utf-8'),
    `# Env vars
<!-- ENV_VARS_START -->
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 |             |         | No       |
<!-- ENV_VARS_END -->
`
  )
})

test('readme can read and write with relative paths', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )

  const readmePath = join(tmp, 'inject.md')
  await writeFile(
    readmePath,
    `# Env vars
<!-- ENV_VARS_START -->
<!-- ENV_VARS_END -->
`
  )

  const cwd = process.cwd()
  const relSchemaPath = relative(cwd, schemaPath)
  const relReadmePath = relative(cwd, readmePath)
  await exec(`node ${cliPath} readme ${relSchemaPath} ${relReadmePath}`)
  equal(
    await readFile(readmePath, 'utf-8'),
    `# Env vars
<!-- ENV_VARS_START -->
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 |             |         | No       |
<!-- ENV_VARS_END -->
`
  )
})

test('readme replaces existing table', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )

  const readmePath = join(tmp, 'inject.md')
  await writeFile(
    readmePath,
    `# Env vars
<!-- ENV_VARS_START -->
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| OLD_1 |             |         | Yes      |
<!-- ENV_VARS_END -->
`
  )

  await exec(`node ${cliPath} readme ${schemaPath} ${readmePath}`)
  equal(
    await readFile(readmePath, 'utf-8'),
    `# Env vars
<!-- ENV_VARS_START -->
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 |             |         | No       |
<!-- ENV_VARS_END -->
`
  )
})

test('readme injects table when spaces between comments', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )

  const readmePath = join(tmp, 'inject.md')
  await writeFile(
    readmePath,
    `# Env vars
<!-- ENV_VARS_START --><!-- ENV_VARS_END -->
`
  )

  await exec(`node ${cliPath} readme ${schemaPath} ${readmePath}`)
  equal(
    await readFile(readmePath, 'utf-8'),
    `# Env vars
<!-- ENV_VARS_START -->
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 |             |         | No       |
<!-- ENV_VARS_END -->
`
  )
})

test('readme injects table when comment is not on new line', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )

  const readmePath = join(tmp, 'inject.md')
  await writeFile(
    readmePath,
    '# Env vars<!-- ENV_VARS_START --><!-- ENV_VARS_END -->'
  )

  await exec(`node ${cliPath} readme ${schemaPath} ${readmePath}`)
  equal(
    await readFile(readmePath, 'utf-8'),
    `# Env vars
<!-- ENV_VARS_START -->
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 |             |         | No       |
<!-- ENV_VARS_END -->
`
  )
})

test('readme errors if missing readme path', async () => {
  const schemaPath = join(tmp, 'schema.json')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )

  const { stderr } = await exec(`node ${cliPath} readme ${schemaPath}`)
  equal(stderr, 'Error: No readme file path provided\n')
})

test('readme errors if missing JSON schema path', async () => {
  const { stderr } = await exec(`node ${cliPath} readme`)
  equal(stderr, 'Error: No schema file path provided\n')
})

test('readme errors if schema is invalid', async () => {
  const schemaPath = join(tmp, 'schema.json')
  const readmePath = join(tmp, 'README.md')
  await writeFile(schemaPath, '"invalid"')
  await writeFile(
    readmePath,
    '# Env vars<!-- ENV_VARS_START --><!-- ENV_VARS_END -->'
  )

  const { stderr } = await exec(`node ${cliPath} readme ${schemaPath} ${readmePath}`)
  equal(stderr, `Error: Schema invalid
Cannot read properties of undefined (reading '$schema')
`)
})

test('readme errors if schema is missing', async () => {
  const schemaPath = join(tmp, 'schema.json')
  const readmePath = join(tmp, 'README.md')
  await writeFile(
    readmePath,
    '# Env vars<!-- ENV_VARS_START --><!-- ENV_VARS_END -->'
  )

  const { stderr } = await exec(`node ${cliPath} readme ${schemaPath} ${readmePath}`)
  equal(stderr, `Error: Schema file not found at path: ${schemaPath}\n`)
})

test('readme errors if readme is missing', async () => {
  const schemaPath = join(tmp, 'schema.json')
  const readmePath = join(tmp, 'README.md')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )

  const { stderr } = await exec(`node ${cliPath} readme ${schemaPath} ${readmePath}`)
  equal(stderr, `Error: readme file not found at ${readmePath}\n`)
})

test('readme errors if readme is missing env var comments', async () => {
  const schemaPath = join(tmp, 'schema.json')
  const readmePath = join(tmp, 'README.md')
  await writeFile(
    schemaPath,
    '{ "properties": { "VAR_1": { "type": "string" } } }'
  )
  await writeFile(readmePath, 'No comments')

  const { stderr } = await exec(`node ${cliPath} readme ${schemaPath} ${readmePath}`)
  equal(stderr, 'Error: No ENV_VARS_START and/or ENV_VARS_END comments in readme\n')
})

test('help shows help', async () => {
  const { stdout } = await exec(`node ${cliPath} help`)
  equal(stdout, `${help}\n`)
})

test('help shows help help', async () => {
  const { stdout } = await exec(`node ${cliPath} help help`)
  equal(stdout, `${help}\n`)
})

test('help readme shows readme help', async () => {
  const { stdout } = await exec(`node ${cliPath} help readme`)
  equal(stdout, `${helpReadme}\n`)
})

test('help dotenv shows dotenv help', async () => {
  const { stdout } = await exec(`node ${cliPath} help dotenv`)
  equal(stdout, `${helpDotenv}\n`)
})

test('help errors for unrecognised command', async () => {
  const { stderr } = await exec(`node ${cliPath} help bad`)
  equal(stderr, 'Error: Invalid command "bad"\n')
})

test('cli errors on invalid command', async () => {
  const { stderr } = await exec(`node ${cliPath} bad`)
  equal(stderr, 'Error: Invalid command "bad"\n')
})
