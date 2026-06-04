import { equal } from 'node:assert/strict'
import { test } from 'node:test'
import { buildTable } from '../index.js'

test('buildTable() builds table for JSON schema', () => {
  const table = buildTable({
    properties: {
      VAR_1: {
        type: 'string',
      },
    },
  })

  equal(
    table,
    `\
| Name  |
| ----- |
| VAR_1 |`
  )
})

test('buildTable() prints descriptions', () => {
  const table = buildTable({
    properties: {
      VAR_1: {
        type: 'string',
        description: 'Description',
      },
    },
  })

  equal(
    table,
    `\
| Name  | Description |
| ----- | ----------- |
| VAR_1 | Description |`
  )
})

test('buildTable() prints default values', () => {
  const table = buildTable({
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
  })

  equal(
    table,
    `\
| Name  | Default |
| ----- | ------- |
| VAR_1 | test    |
| VAR_2 | true    |
| VAR_3 | false   |
| VAR_4 | 100     |
| VAR_5 | null    |`
  )
})

test("buildTable() prints 'Yes' and 'No' in 'Required' column for required and optional vars", () => {
  const table = buildTable({
    required: ['VAR_1'],
    properties: {
      VAR_1: {
        type: 'string',
      },
      VAR_2: {
        type: 'string',
      },
    },
  })

  equal(
    table,
    `\
| Name  | Required |
| ----- | -------- |
| VAR_1 | Yes      |
| VAR_2 | No       |`
  )
})

test('buildTable() adds all columns if at least 1 description, default and required field exist', () => {
  const table = buildTable({
    required: ['VAR_1'],
    properties: {
      VAR_1: {
        type: 'string',
        description: 'Description',
        default: 'value',
      },
    },
  })

  equal(
    table,
    `\
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 | Description | value   | Yes      |`
  )
})

test('buildTable() columns maintain minium width of header lengths', () => {
  const table = buildTable({
    required: [],
    properties: {
      V: {
        type: 'string',
        description: 'D',
        default: 'd',
      },
    },
  })

  equal(
    table,
    `\
| Name | Description | Default | Required |
| ---- | ----------- | ------- | -------- |
| V    | D           | d       | No       |`
  )
})

test('buildTable() columns grown to max value length', () => {
  const table = buildTable({
    required: ['LONG_VAR_NAME'],
    properties: {
      LONG_VAR_NAME: {
        type: 'string',
        description: 'A long description',
        default: 'With a long default value',
      },
    },
  })

  equal(
    table,
    `\
| Name          | Description        | Default                   | Required |
| ------------- | ------------------ | ------------------------- | -------- |
| LONG_VAR_NAME | A long description | With a long default value | Yes      |`
  )
})

test('buildTable() adds multiple rows', () => {
  const table = buildTable({
    required: ['LONG_VAR_NAME'],
    properties: {
      LONG_VAR_NAME: {
        type: 'string',
        description: 'A long description',
        default: 'With a long default value',
      },
      VAR_2: {
        type: 'string',
      },
    },
  })

  equal(
    table,
    `\
| Name          | Description        | Default                   | Required |
| ------------- | ------------------ | ------------------------- | -------- |
| LONG_VAR_NAME | A long description | With a long default value | Yes      |
| VAR_2         |                    |                           | No       |`
  )
})

test('buildTable() returns empty string for empty schema', () => {
  equal(buildTable({}), '')
  equal(buildTable({ properties: {} }), '')
})
