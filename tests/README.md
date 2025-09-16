# Test Directory Structure

This directory contains all test files organized by test type:

## Directory Structure

- `unit/` - Unit test files (*.test.ts, *.test.js)
  - Tests for individual functions and components in isolation
  - Each source file should have a corresponding test file here

- `integration/` - Integration test files
  - Tests for component interactions and Chrome API integrations
  - Tests for storage operations and data persistence
  - Tests for cross-component data flow

- `e2e/` - End-to-end test files
  - Tests for complete user workflows
  - Tests for Cabinet creation, saving, and restoration processes
  - Tests for multi-tab scenarios and complex hierarchies

## Naming Convention

Test files should mirror the source file structure for easy navigation:
- Source: `tab-hierarchy-engine.ts` → Test: `tests/unit/tab-hierarchy-engine.test.ts`
- Source: `cabinet-system.ts` → Test: `tests/unit/cabinet-system.test.ts`