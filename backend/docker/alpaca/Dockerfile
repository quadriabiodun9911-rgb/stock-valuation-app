FROM python:3.12-slim

WORKDIR /app

# Install optional Alpaca requirements in an isolated container
COPY ../../optional-requirements-alpaca.txt /app/optional-requirements-alpaca.txt
RUN python -m pip install --no-cache-dir -r optional-requirements-alpaca.txt

# Purpose: run Alpaca-related services or scripts here. Keep the container minimal and
# isolated from the main application runtime to avoid dependency conflicts.

CMD ["/bin/sh", "-c", "echo 'Alpaca container ready. Mount your code and run your script.' && sleep infinity"]
