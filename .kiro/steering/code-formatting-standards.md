# Code Formatting Standards

## Prettier Configuration Compliance

### Always Respect Existing Prettier Settings
- **CRITICAL**: When making code changes, always respect the current prettier configuration
- **Avoid Formatting Diffs**: Do not introduce formatting changes unrelated to your actual code modifications
- **Current Settings**: Follow the project's `.prettierrc` configuration:
  - `trailingComma: "all"`
  - `semi: true`
  - `singleQuote: true`
  - `arrowParens: "avoid"`
  - `printWidth: 120`
  - `bracketSameLine: true`
  - `htmlWhitespaceSensitivity: "strict"`
  - Tailwind CSS plugin enabled

### Code Style Guidelines
- Use single quotes for strings
- Include trailing commas in objects and arrays
- Keep semicolons at the end of statements
- Avoid parentheses around single arrow function parameters
- Maintain 120 character line width
- Place opening brackets on the same line
- Use strict HTML whitespace sensitivity

### Before Submitting Changes
- Run `pnpm format` to ensure consistent formatting
- Only commit formatting changes that are directly related to your code modifications
- If you need to reformat existing code, do it in a separate commit with clear intent

### Implementation Notes
- When creating new files, follow the established patterns in similar existing files
- When modifying existing files, maintain the current formatting style
- Use the project's ESLint and Prettier configurations as the source of truth