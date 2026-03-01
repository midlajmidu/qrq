"""
app/core/logging.py
Structured logging setup for the entire application.
"""
import logging
import sys
from app.core.config import get_settings

settings = get_settings()


def setup_logging() -> None:
    """Configure root logger with structured output."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Quiet noisy libraries in production
    if settings.is_production:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    logging.info("Logging initialised | level=%s | env=%s", settings.LOG_LEVEL, settings.ENVIRONMENT)
