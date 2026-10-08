#!/usr/bin/env python3
"""Publish intake JSON and a compact catalog under the GitHub Pages directory."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "entries"
PUBLIC = ROOT / "docs" / "data"
PUBLIC_ENTRIES = PUBLIC / "entries"
def main():
    PUBLIC_ENTRIES.mkdir(parents=True, exist_ok=True)
    rows = []
    names = set()
    for path in sorted(SOURCE.glob("*.json")):
        entry = json.loads(path.read_text(encoding="utf-8"))
        if entry.get("id") != path.stem:
            raise ValueError(f"Entry ID differs from filename: {path.name}")
        names.add(path.name)
        target = PUBLIC_ENTRIES / path.name
        source_bytes = path.read_bytes()
        if not target.exists() or target.read_bytes() != source_bytes:
            target.write_bytes(source_bytes)
        profile = entry.get("profile") or {}
        rows.append({
            "id": entry["id"],
            "customerOrganization": profile.get("customerOrganization") or "",
            "workloadName": profile.get("workloadName") or (entry.get("workloads") or [{}])[0].get("name") or "",
            "engagementType": profile.get("engagementType") or "",
            "solutionArchitect": profile.get("solutionArchitect") or "",
            "targetGoLive": profile.get("targetGoLive") or "",
            "updatedAt": entry.get("updatedAt") or "",
        })
    for path in PUBLIC_ENTRIES.glob("*.json"):
        if path.name not in names:
            path.unlink()
    rows.sort(key=lambda item: item["updatedAt"], reverse=True)
    (PUBLIC / "catalog.json").write_text(
        json.dumps({"entries": rows}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
if __name__ == "__main__":
    main()
