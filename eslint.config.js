import neostandard from 'neostandard'

const ns = neostandard({ env: ['node'] })

// Bumping to 2025 for support for import assertions
for (const item of ns) {
  if (item?.languageOptions?.ecmaVersion < 2025) {
    item.languageOptions.ecmaVersion = 2025
  }
}

export default ns
