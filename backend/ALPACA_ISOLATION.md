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

CI behavior
-----------

- The repository includes a manual, guarded workflow that will be skipped if Alpaca secrets are not set for the repo. You can trigger the workflow manually after adding secrets in the repository Settings → Secrets, or run the integration locally via the Docker compose snippet.
