from __future__ import annotations
import logging, os, sys
from pythonjsonlogger import jsonlogger

def configure_logging(name: str) -> logging.Logger:
    h = logging.StreamHandler(sys.stdout)
    h.setFormatter(jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level", "name": "logger"},
    ))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(h)
    root.setLevel(os.environ.get("LOG_LEVEL", "INFO").upper())
    return logging.LoggerAdapter(
        logging.getLogger(name),
        {"service": name, "env": os.environ.get("NODE_ENV", "development")},
    )  # type: ignore[return-value]
