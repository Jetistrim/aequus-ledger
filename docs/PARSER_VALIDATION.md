# Parser Validation Guide

This guide defines how to validate parser behavior with synthetic and real statements without committing sensitive files.

## Real Fixtures Policy

- Do not commit real bank statements.
- Keep local real fixtures in frontend/tests/e2e/real-fixtures/.
- The directory is ignored by git.
- Remove or mask personal data before test execution whenever possible.

## Playwright Real File Inputs

Set environment variables to point to local files:

- CSV_FILE_PATH
- OFX_FILE_PATH
- XLS_FILE_PATH
- XLSX_FILE_PATH

When a variable is set, E2E specs use that file path. If missing, tests fall back to in-memory synthetic fixtures.

## Local Execution

Run all E2E tests:

- npm run test:e2e --prefix frontend

Run with real files (PowerShell example):

- $env:CSV_FILE_PATH = "C:/local/fixtures/real.csv"
- $env:OFX_FILE_PATH = "C:/local/fixtures/real.ofx"
- $env:XLS_FILE_PATH = "C:/local/fixtures/real.xls"
- $env:XLSX_FILE_PATH = "C:/local/fixtures/real.xlsx"
- npm run test:e2e --prefix frontend

## Coverage Matrix

The current status and pending scenarios are tracked in:

- frontend/tests/e2e/test-matrix.json

## Acceptance Criteria

- All baseline E2E specs pass with synthetic fixtures.
- At least one real file per format parses successfully.
- No sensitive fixture is committed to git.
- Upload responses remain below HTTP 400 in successful parser flows.
