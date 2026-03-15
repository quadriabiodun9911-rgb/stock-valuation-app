This branch prepares a staged major upgrade of `expo` to address transitive vulnerabilities (tar/cacache).

Plan:
- Update `expo` and related runtime dependencies in `mobile/package.json`.
- Run `npm install --legacy-peer-deps` locally and fix breaking changes.
- Run mobile CI (web/android/ios) and manual smoke tests.

Note: This placeholder creates the PR; actual upgrade commits will follow.
