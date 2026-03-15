**Alpaca Isolation**

Purpose: keep `alpaca-trade-api` out of the main runtime `requirements.txt` so the project can upgrade core HTTP libraries safely.

Quick steps for developers:

- Install optional Alpaca deps locally when needed:

  python -m pip install -r backend/optional-requirements-alpaca.txt

- To run Alpaca integration tests locally using Docker:

  1. Create `backend/.env.alpaca` with `APCA_API_KEY_ID` and `APCA_API_SECRET_KEY`.
  2. Start the container:

     docker compose -f backend/docker/alpaca/docker-compose.yml up --build

- CI: We added a manual GitHub Actions workflow at `.github/workflows/alpaca-integration.yml`.
  This workflow installs the optional requirements and runs tests that match `-k alpaca`.

Notes:

- Keep secrets out of PR logs; the workflow uses GitHub Secrets and is manual (`workflow_dispatch`).
- When Alpaca or upstream libraries release compatibility with `urllib3>=2` and `websockets>=11`, we can move Alpaca back into main requirements.
ALPACA dependency isolation
==========================

Background
----------

The project currently uses `alpaca-trade-api` in development environments. That package pins older `urllib3` and `websockets` ranges which conflict with upgraded runtime HTTP libraries (see PR #10).

Recommendation
--------------

- Install `alpaca-trade-api` separately when needed using the optional requirements file: `pip install -r optional-requirements-alpaca.txt`.
- This lets CI and runtime installs apply security patches for core HTTP libraries while keeping Alpaca usage isolated.

Next steps
----------

1. Investigate upgrading `alpaca-trade-api` upstream to support `urllib3 2.x` and modern `websockets`.
2. If upgrade is not available, consider running Alpaca-related code in a separate service/container with its own dependencies.
