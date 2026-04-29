from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
PUBLIC_STATIC_DIR = ROOT / "public" / "static"


def main() -> None:
    PUBLIC_STATIC_DIR.mkdir(parents=True, exist_ok=True)

    for source in STATIC_DIR.rglob("*"):
        if not source.is_file():
            continue

        target = PUBLIC_STATIC_DIR / source.relative_to(STATIC_DIR)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    print(f"Synced {STATIC_DIR} to {PUBLIC_STATIC_DIR}")


if __name__ == "__main__":
    main()
