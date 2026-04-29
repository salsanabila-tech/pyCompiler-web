from __future__ import annotations

import sys
from pathlib import Path

from flask import Flask, jsonify, render_template, request


ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "pycompiler-web"
sys.path.insert(0, str(WEB_DIR))

from compiler_engine import compile_source  # noqa: E402


app = Flask(
    __name__,
    template_folder=str(WEB_DIR / "templates"),
    static_folder=str(WEB_DIR / "static"),
)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/compile")
def compile_route():
    data = request.get_json(silent=True) or {}

    try:
        result = compile_source(
            source_code=data.get("source_code", ""),
            x_start=data.get("x_start", 0),
            x_end=data.get("x_end", 10),
        )
        return jsonify(result)
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 400


if __name__ == "__main__":
    app.run(debug=True)
