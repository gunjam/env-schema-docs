# env-schema-docs

Command line tool to update environment variable documentation from a JSON
schema, indented for use with the
[env-schema](https://github.com/fastify/env-schema) utility.

* [Install](#install)
* [Usage](#usage)
  * [Readmes](#readmes)
  * [Dotenv files](#dotenv-files)
  * [Help](help)

## Install

```
npm i env-schema-docs
```

## Usage

### Readmes

Run the `readme` command to inject a markdown table into a markdown file. There
must be `<!-- ENV_VARS_START -->` and `<!-- ENV_VARS_END -->` comments in the
file, the table will be injected between them.

```
npx envdocs readme ./schema.json ./README.md
```

Updated file:

```markdown
# Environment variables
<!-- ENV_VARS_START -->
| Name | Description       | Default | Required |
| ---- | ----------------- | ------- | -------- |
| PORT | Port to listen on | 3000    | Yes      |
<!-- ENV_VARS_END -->
```

The schema must be a valid JSON Schema, either as a JSON file or a JavaScript
file that exports a JSON Schema as the default export or a name export of
"schema".

The `buildTable()` function can also be used programatically:

```javascript
import { buildTable } from "env-schema-docs"

const schema = {
  type: 'object',
  required: ['PORT'],
  properties: {
    PORT: {
      description: 'Port to listen on'
      type: 'number',
      default: 3_000
    }
  }
}

const table = buildTable(schema)
console.log(table)
/* output:
| Name | Description       | Default | Required |
| ---- | ----------------- | ------- | -------- |
| PORT | Port to listen on | 3000    | Yes      |
*/
```

### Dotenv files

The `dotenv` command allows you to create a env file from a JSON schema. It
can also be used to update an env file with new variables while preserving any
existing values.

For the schema:

```json
{
  "type": "object",
  "required": ["PORT"],
  "properties": {
    "PORT": {
      "description": "Port to listen on"
      "type": "number",
      "default": 3000
    }
  }
}
```

The command:

```
npx envdocs dotenv ./schema.json ./.env
```

Will create:

```sh
PORT=
```

Comments can be included using the `--comments` or `-c` flag, they will include
the description text, whether the variable is required and any default values:

```
npx envdocs dotenv ./schema.json ./.env --comments
```

```sh
# Port to listen on
# Required. Default: 3000
PORT=
```

You can use the schema default values as the variable values by using the
`--defaults` or `-d` flag.

```
npx envdocs dotenv ./schema.json ./.env --defaults
```

```sh
PORT=3000
```

You can update an existing dotenv file to include new variables or comments and
retain any existing variable values by using the `--update` or `-u` flag:

```
npx envdocs dotenv ./schema.json ./.env --update
```

### Help

Help can be accessed using the `help` command. For command specific help, use
`help` followed by the command you need help with:

```
$ npx envdocs help
Generate environment variable docs from a JSON schema

VERSION
  env-schema-docs/0.1.0 darwin-arm64 node-v24.15.0

USAGE
  $ envdocs [COMMAND]

COMMANDS
  help     Display help for envdocs or an envdocs command
  readme   Inject a markdown table of environment variables into a readme file
  dotenv   Generate or update a dotenv file
```

```
$ npx envdocs help readme
Inject a markdown table of environment variables into a readme file

USAGE
  $ envdocs readme SCHEMAPATH READMEPATH

ARGUMENTS
  SCHEMAPATH  The path to the JSON schema, either a JSON file or a JS file that
              exports a schema as the default value or a name export of "schema"
  READMEPATH  The path to the readme file

DESCRIPTION
  Inject a markdown table of environment variables into a readme file. The table
  will appear between the "<!-- ENV_VARS_START -->" and "<!-- ENV_VARS_END -->"
  comments within the file.

EXAMPLES
  $ envdocs readme ./schemas/env.json ./README.md
```

```
$ npx envdocs help dotenv
Generate or update a dotenv file

USAGE
  $ envdocs dotenv SCHEMAPATH DOTENVPATH [-c] [-d] [-u]

ARGUMENTS
  SCHEMAPATH  The path to the JSON schema, either a JSON file or a JS file that
              exports a schema as the default value or a name export of "schema"
  READMEPATH  The path to the dotenv file

FLAGS
  -c, --comments  Comment each variable with the schema description
  -d, --defaults  Set the schema defaults as the variable values
  -u, --update    If the file already exists, preserve variable values

DESCRIPTION
  Generate or update a dotenv file

EXAMPLES
  $ envdocs dotenv ./schemas/env.json ./.env.example -c -d
  $ envdocs dotenv ./schemas/env.json ./.env -u
```
