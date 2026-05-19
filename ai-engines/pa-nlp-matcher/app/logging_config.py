"""
Structured JSON logging for AI engines.

Same shape as the Node services' winston output so Logstash can ingest
them with one parser.
"""
from __future__ import annotations

import logging
import os
import sys

from pythonjsonlogger import jsonlogger


def configure_logging(service_name: str) -> logging.Logger:
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level", "name": "logger"},
    )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(os.environ.get("LOG_LEVEL", "INFO").upper())

    log = logging.getLogger(service_name)
    log = logging.LoggerAdapter(log, {"service": service_name, "env": os.environ.get("NODE_ENV", "development")})  # type: ignore[assignment]
    return log  # type: ignore[return-value]
