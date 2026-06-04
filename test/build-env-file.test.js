import { equal } from 'node:assert/strict'
import { test } from 'node:test'
import { buildEnvFile } from '../index.js'

test('buildEnvFile() builds .env file for JSON schema', () => {
  const dotenv = buildEnvFile({
    properties: {
      VAR_1: {
        type: 'string',
      },
    },
  })

  equal(dotenv, 'VAR_1=\n')
})

test('buildEnvFile() adds multiple values', () => {
  const schema = {
    properties: {
      VAR_1: {
        type: 'string'
      },
      VAR_2: {
        type: 'string'
      },
      VAR_3: {
        type: 'string'
      },
    },
  }

  const dotenv = buildEnvFile(schema, false, false)
  equal(dotenv, 'VAR_1=\nVAR_2=\nVAR_3=\n')
})

test('buildEnvFile() add descriptions as comments', () => {
  const schema = {
    properties: {
      VAR_1: {
        description: 'Description',
        type: 'string',
      },
    },
  }

  const dotenv = buildEnvFile(schema, true)
  equal(dotenv, '# Description\nVAR_1=\n')
})

test('buildEnvFile() breaks description comments at 80 characters', () => {
  const schema = {
    properties: {
      VAR_1: {
        description: 'A very very very very very very very very very very very very very long description',
        type: 'string',
      },
    },
  }

  const dotenv = buildEnvFile(schema, true)
  equal(dotenv, `\
# A very very very very very very very very very very very very very long
# description
VAR_1=
`)
})

test('buildEnvFile() includes required status in comment', () => {
  const schema = {
    required: ['VAR_1'],
    properties: {
      VAR_1: {
        type: 'string',
      },
    },
  }

  const dotenv = buildEnvFile(schema, true)
  equal(dotenv, '# Required\nVAR_1=\n')
})

test('buildEnvFile() includes default in comment', () => {
  const schema = {
    properties: {
      VAR_1: {
        type: 'string',
        default: 'test'
      },
      VAR_2: {
        type: 'boolean',
        default: true
      },
      VAR_3: {
        type: 'boolean',
        default: false
      },
      VAR_4: {
        type: 'number',
        default: 100
      },
      VAR_5: {
        type: 'null',
        default: null
      },
    },
  }

  const dotenv = buildEnvFile(schema, true)
  equal(dotenv, `\
# Default: test
VAR_1=

# Default: true
VAR_2=

# Default: false
VAR_3=

# Default: 100
VAR_4=

# Default: null
VAR_5=
`)
})

test('buildEnvFile() includes description,required status and default in comment', () => {
  const schema = {
    required: ['VAR_1'],
    properties: {
      VAR_1: {
        description: 'Description',
        type: 'string',
        default: 'test'
      },
    },
  }

  const dotenv = buildEnvFile(schema, true)
  equal(dotenv, '# Description\n# Required. Default: test\nVAR_1=\n')
})

test('buildEnvFile() uses default as value', () => {
  const schema = {
    properties: {
      VAR_1: {
        type: 'string',
        default: 'test'
      },
      VAR_2: {
        type: 'boolean',
        default: true
      },
      VAR_3: {
        type: 'boolean',
        default: false
      },
      VAR_4: {
        type: 'number',
        default: 100
      },
      VAR_5: {
        type: 'null',
        default: null
      },
    },
  }

  const dotenv = buildEnvFile(schema, false, true)
  equal(dotenv, `\
VAR_1="test"
VAR_2=true
VAR_3=false
VAR_4=100
VAR_5=null
`)
})

test('buildEnvFile() uses existing values as var values', () => {
  const schema = {
    properties: {
      VAR_1: {
        type: 'string'
      },
      VAR_2: {
        type: 'boolean'
      },
      VAR_3: {
        type: 'boolean'
      },
      VAR_4: {
        type: 'number'
      },
      VAR_5: {
        type: 'null'
      },
    }
  }

  const values = {
    VAR_1: 'value',
    VAR_2: true,
    VAR_3: false,
    VAR_4: 100,
    VAR_5: null
  }

  const dotenv = buildEnvFile(schema, false, false, values)
  equal(dotenv, `\
VAR_1="value"
VAR_2=true
VAR_3=false
VAR_4=100
VAR_5=null
`)
})

test('buildEnvFile() priorities existing values over schema defaults', () => {
  const schema = {
    properties: {
      VAR_1: {
        type: 'string',
        default: 'default'
      }
    }
  }

  const values = {
    VAR_1: 'value'
  }

  const dotenv = buildEnvFile(schema, false, true, values)
  equal(dotenv, 'VAR_1="value"\n')
})

test('buildEnvFile() returns empty string for empty schema', () => {
  equal(buildEnvFile({}), '')
  equal(buildEnvFile({ properties: {} }), '')
})
