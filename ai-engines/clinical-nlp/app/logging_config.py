from __future__ import annotations

import logging
import os
import sys

from pythonjsonlogger import jsonlogger


def configure_logging(service_name: str) -> logging.Logger:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level", "name": "logger"},
    ))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(os.environ.get("LOG_LEVEL", "INFO").upper())
    return logging.LoggerAdapter(
        logging.getLogger(service_name),
        {"service": service_name, "env": os.environ.get("NODE_ENV", "development")},
    )  # type: ignore[return-value]
