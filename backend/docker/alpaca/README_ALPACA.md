Alpaca Isolation Container
==========================

Purpose
-------

This directory contains a minimal Dockerfile to run Alpaca-related code in an isolated
container with its own dependency set. Use this when `alpaca-trade-api` conflicts with
runtime packages (e.g., `urllib3` or `websockets`).

Quick start
-----------

1. Build the image from the repository root:

```bash
cd backend
docker build -f docker/alpaca/Dockerfile -t stock-app-alpaca:latest .
```

1. Run the container and mount your project code (adjust path and command as needed):

```bash
docker run --rm -it \
  -v "$PWD":/app/project \
  -e APCA_API_KEY_ID=your_key \
  -e APCA_API_SECRET_KEY=your_secret \
  stock-app-alpaca:latest /bin/sh
# Inside the container: cd project && python scripts/alpaca_worker.py
```

Notes
-----

- This container is intentionally minimal and meant to host Alpaca-only workloads.
- Use it to keep Alpaca's pinned `urllib3`/`websockets` independent of the main
  application's environment.
- For production, run Alpaca-dependent components as a separate service with
  its own CI and dependency lifecycle.
