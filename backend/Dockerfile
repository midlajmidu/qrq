FROM python:3.11-slim

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN addgroup --system app && adduser --system --group app

WORKDIR /app

# Install dependencies first (leverages Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project source
COPY . .

# Ensure the app user owns the project
RUN chown -R app:app /app
USER app

# Expose the default port (Render will override this, but it's good practice)
EXPOSE 10000

# Use gunicorn with uvicorn workers for production-grade concurrency
# Binding to $PORT via sh -c to allow Render's dynamic port assignment
CMD ["sh", "-c", "export PYTHONPATH=/app && alembic upgrade head && gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT"]