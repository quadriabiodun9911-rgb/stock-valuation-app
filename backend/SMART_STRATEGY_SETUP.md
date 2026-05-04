Setup for Smart Strategy optional features

This file documents how to enable Redis persistence, Prometheus metrics, and API auth for the smart-strategy endpoints.

1) Install optional dependencies (in your backend venv):

```bash
pip install redis prometheus_client
```

1) Configure environment variables (copy `.env.example` to `.env` in `backend/`):

- `SMART_STRATEGY_REDIS_URL` — Redis connection URL (optional). If set, job results will be stored in Redis with expiry.
- `SMART_STRATEGY_API_KEY` — If set, clients must provide `X-API-KEY` header or `api_key` query param.
- `PROMETHEUS_METRICS_PORT` — Port where Prometheus metrics HTTP server will run (optional).
- `SMART_STRATEGY_MAX_SYMBOLS` — Max symbols allowed per-request (env cap).
- `SMART_STRATEGY_SYMBOL_TIMEOUT` — Per-symbol timeout in seconds.
- `SMART_STRATEGY_RETENTION_DAYS` — Retention for persisted job files.

1) Run backend with the venv activated:

```bash
source "/Users/abiodunquadri/kivy/new work foler /.venv/bin/activate"
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

1) Usage examples:

- Start async job (POST):

```bash
curl -X POST 'http://127.0.0.1:8000/smart-strategy/async?max_symbols=8' -H "X-API-KEY: your-api-key-here" | jq
```

- Poll job status:

```bash
curl 'http://127.0.0.1:8000/smart-strategy/async/<job_id>' -H "X-API-KEY: your-api-key-here" | jq
```

- Sync call with max symbols:

```bash
curl 'http://127.0.0.1:8000/smart-strategy?max_symbols=6' -H "X-API-KEY: your-api-key-here" | jq
```

- Prometheus metrics: if `prometheus_client` is installed and `PROMETHEUS_METRICS_PORT` set, scrape metrics on that port.

1) Notes

- If Redis is unavailable, the system falls back to file persistence under `backend/data/smart_strategy_jobs/`.
- Retention cleaner runs in background to remove old job files. For production, consider using Redis or DB and robust job queues.
