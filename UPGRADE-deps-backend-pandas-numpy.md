This branch prepares incremental upgrades for heavy numeric libraries (`pandas`, `numpy`).

Plan:
- Bump `numpy` and `pandas` minor/patch versions in `backend/requirements.txt`.
- Run backend tests locally and in CI; address any C-extension rebuild or compatibility issues.
- If needed, split into smaller PRs per library to reduce risk.

Note: Placeholder file to create PR; implementation commits will follow.
