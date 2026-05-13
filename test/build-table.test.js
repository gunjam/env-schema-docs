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
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 |             |         | No       |`
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
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 | Description |         | No       |`
  )
})

test('buildTable() prints default values', () => {
  const table = buildTable({
    properties: {
      VAR_1: {
        type: 'string',
        default: 'Test',
      },
    },
  })

  equal(
    table,
    `\
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 |             | Test    | No       |`
  )
})

test("buildTable() prints 'Yes' in 'Required' column if it's a required var", () => {
  const table = buildTable({
    required: ['VAR_1'],
    properties: {
      VAR_1: {
        type: 'string',
      },
    },
  })

  equal(
    table,
    `\
| Name  | Description | Default | Required |
| ----- | ----------- | ------- | -------- |
| VAR_1 |             |         | Yes      |`
  )
})

test('buildTable() columns maintain minium width of header lengths', () => {
  const table = buildTable({
    properties: {
      V: {
        type: 'string',
      },
    },
  })

  equal(
    table,
    `\
| Name | Description | Default | Required |
| ---- | ----------- | ------- | -------- |
| V    |             |         | No       |`
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
