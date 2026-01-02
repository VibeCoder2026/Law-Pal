import json
from pathlib import Path

p = Path("src/assets/constitution.json")
data = json.loads(p.read_text(encoding="utf-8"))
secs = data["sections"]

bad = []
for s in secs:
    if not s.get("chunk_id") or not s.get("section_number") or s.get("text") is None or s.get("text").strip() == "":
        bad.append(s)

print("BAD (missing/empty):", len(bad))
for s in bad:
    print(s.get("chunk_id"), s.get("section_number"), "heading=", (s.get("heading") or "")[:80])

print("\nSHORTEST 20:")
shortest = sorted(secs, key=lambda x: len((x.get("text") or "").strip()))
for s in shortest[:20]:
    t = (s.get("text") or "").strip().replace("\n", " ")
    print(f"{s['chunk_id']:10} sec={s['section_number']:6} len={len(t):4} text='{t[:120]}'")
