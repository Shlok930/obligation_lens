# Obligation Lens

A local-first React app for recording commitments, tracking important dates and actions, reviewing document-derived findings, and managing JSON backups. There is no backend or account sync. Document analysis is a transparent rule-based prototype; verify extracted details against the original document.

## Development

- `npm.cmd run dev` starts the local development server.
- `npm.cmd test` runs the built-in Node test suite.
- `npm.cmd run lint` runs Oxlint.
- `npm.cmd run build` creates the production bundle.

## Local data and backups

Commitments are stored in this browser profile under the `obligation-lens-commitments` key. The stored value uses schema version 1. Existing plain-array data is validated and migrated under the same key; malformed data and unsupported future versions are preserved and reported instead of being replaced.

Settings exports a JSON backup with this structure:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-10-22T00:00:00.000Z",
  "application": "Obligation Lens",
  "commitments": []
}
```

Imports are validated and previewed before applying. Merge keeps existing records by default when IDs or conservative title/category/merchant/date/reference matching suggest a duplicate, with an option to import conflicting records as new copies. Replace requires a separate confirmation. Backups remain local unless you choose where to save or move the downloaded file.

Document analysis history stores metadata only, never pasted document text. Accepted findings are saved only after review and confirmation; those findings retain only their evidence excerpt and finding metadata with the commitment. Extracted amounts are not used as the commitment purchase amount.

The Obligation Explorer health summary uses this precedence: explicitly completed, overdue incomplete action, upcoming action/date or passed expected-refund date, on track when usable timeline data shows none of those conditions, then insufficient information when timing cannot be assessed. Its what-if panel uses temporary copies and does not save until the user selects a save action. Payment verification and remaining balances are not tracked by this app.
