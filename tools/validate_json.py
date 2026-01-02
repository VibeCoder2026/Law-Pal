import json, re
from pathlib import Path
from collections import Counter

JSON_PATH = Path("src/assets/constitution.json")

def main():
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    sections = data.get("sections", [])
    print("doc_id:", data.get("doc_id"))
    print("title:", data.get("title"))
    print("sections:", len(sections))

    # basic schema checks
    missing = []
    for i, s in enumerate(sections):
        for k in ["chunk_id", "section_number", "text"]:
            if k not in s or s[k] in (None, ""):
                missing.append((i, k))
    print("missing required fields:", len(missing))

    # duplicate IDs
    ids = [s.get("chunk_id") for s in sections]
    dup_ids = [k for k, v in Counter(ids).items() if v > 1]
    print("duplicate chunk_id:", len(dup_ids))
    if dup_ids[:10]:
        print("  examples:", dup_ids[:10])

    # section_number sanity
    nums = []
    bad_nums = []
    for s in sections:
        sn = str(s.get("section_number", "")).strip()
        if re.fullmatch(r"\d+", sn):
            nums.append(int(sn))
        else:
            bad_nums.append(sn)
    print("numeric section_number:", len(nums))
    print("non-numeric section_number:", len(bad_nums))

    if nums:
        nums_sorted = sorted(set(nums))
        gaps = []
        for a, b in zip(nums_sorted, nums_sorted[1:]):
            if b != a + 1:
                gaps.append((a, b))
        print("unique numeric sections:", len(nums_sorted))
        print("min/max section:", nums_sorted[0], nums_sorted[-1])
        print("gaps found:", len(gaps))
        if gaps[:10]:
            print("  examples gaps:", gaps[:10])

    # empty/too-short text
    short = []
    for s in sections:
        t = (s.get("text") or "").strip()
        if len(t) < 40:
            short.append(s.get("chunk_id"))
    print("very short sections (<40 chars):", len(short))
    if short[:10]:
        print("  examples:", short[:10])

if __name__ == "__main__":
    main()