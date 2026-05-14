import { equal } from 'node:assert/strict'
import { test } from 'node:test'
import { buildEnvFile } from '../index.js'

test('buildEnvFile() builds .env file for JSON schema', () => {
  const table = buildEnvFile({
    properties: {
      VAR_1: {
        type: 'string',
      },
    },
  })

  equal(table, 'VAR_1=\n')
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

  const table = buildEnvFile(schema, false, false)
  equal(table, 'VAR_1=\nVAR_2=\nVAR_3=\n')
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

  const table = buildEnvFile(schema, true)

  equal(table, '# Description\nVAR_1=\n')
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

  const table = buildEnvFile(schema, true)

  equal(table, `\
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
        description: 'Description',
        type: 'string',
      },
    },
  }

  const table = buildEnvFile(schema, true)
  equal(table, '# Description\n# Required\nVAR_1=\n')
})

test('buildEnvFile() includes default in comment', () => {
  const schema = {
    properties: {
      VAR_1: {
        description: 'Description',
        type: 'string',
        default: 'test'
      },
    },
  }

  const table = buildEnvFile(schema, true)
  equal(table, '# Description\n# Default: test\nVAR_1=\n')
})

test('buildEnvFile() includes required status and default in comment', () => {
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

  const table = buildEnvFile(schema, true)
  equal(table, '# Description\n# Required. Default: test\nVAR_1=\n')
})

test('buildEnvFile() uses default as value', () => {
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

  const table = buildEnvFile(schema, false, true)
  equal(table, 'VAR_1="test"\n')
})

test('buildEnvFile() uses existing values as var values', () => {
  const schema = {
    properties: {
      VAR_1: {
        type: 'string'
      }
    }
  }

  const values = {
    VAR_1: 'value'
  }

  const table = buildEnvFile(schema, false, true, values)
  equal(table, 'VAR_1="value"\n')
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

  const table = buildEnvFile(schema, false, true, values)
  equal(table, 'VAR_1="value"\n')
})

test('buildEnvFile() returns empty string for empty schema', () => {
  equal(buildEnvFile({}), '')
  equal(buildEnvFile({ properties: {} }), '')
})
