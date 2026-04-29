from __future__ import annotations

from flask import Flask, jsonify, render_template, request

from compiler_engine import compile_source


app = Flask(__name__)
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
