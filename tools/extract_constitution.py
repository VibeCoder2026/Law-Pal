import re, json
from pathlib import Path
from collections import Counter
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "law_sources" / "constitution.pdf"
OUT_PATH = ROOT / "src" / "assets" / "constitution.json"
REPORT_PATH = ROOT / "tools" / "extractor_report.txt"

MAX_SECTION_NUMERIC = 500

def extract_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)

def normalize(t: str) -> str:
    t = re.sub(r"-\n(\w)", r"\1", t)
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t

def find_toc_start(t: str):
    m = re.search(r"\bARRANGEMENT OF SECTIONS\b", t, re.IGNORECASE)
    return m.start() if m else None

def find_body_start(t: str):
    # Strong anchor: the real first section text line
    m = re.search(r"(?m)^\s*1\.\s+Guyana\s+is\b", t)
    if not m:
        return None
    # Back up to nearest CHAPTER I above it
    up = t[:m.start()]
    ch = list(re.finditer(r"\bCHAPTER\s+I\b", up, flags=re.IGNORECASE))
    return ch[-1].start() if ch else m.start()

def parse_toc_headings(toc_text: str):
    # Accept lettered ids too: 38E, 212A
    sec_line_re = re.compile(r"^(\d+[A-Z]{0,3})\.\s*(.+)$")
    lines = [ln.strip() for ln in toc_text.splitlines() if ln.strip()]
    out = {}
    cur = None
    parts = []
    for ln in lines:
        m = sec_line_re.match(ln)
        if m:
            if cur is not None:
                h = " ".join(parts).strip()
                h = re.sub(r"\s+\d+\s*$", "", h)
                if h:
                    out[cur] = h
            cur = m.group(1).upper()
            parts = [m.group(2).strip()]
        else:
            if cur is not None:
                parts.append(ln)
    if cur is not None:
        h = " ".join(parts).strip()
        h = re.sub(r"\s+\d+\s*$", "", h)
        if h:
            out[cur] = h
    return out

def safe_id(sec_id: str) -> str:
    return "sec-" + re.sub(r"[^0-9A-Z]+", "", sec_id.upper())

def parse_body_sections(body_text: str):
    """
    More strict header detection:
    - Must be at start of line
    - Accepts: 38E.   or 38E.-  or 38E:  (some PDFs vary)
    """
    header_re = re.compile(r"(?m)^\s*(\d+[A-Z]{0,3})\s*[.\-:]\s*(.*)\s*$")
    matches = list(header_re.finditer(body_text))
    if len(matches) < 50:
        raise RuntimeError("Not enough headings detected; header regex may need adjustment.")

    sections = []
    for i, m in enumerate(matches):
        sec_id = m.group(1).upper()
        numeric = int(re.match(r"\d+", sec_id).group(0))
        if numeric > MAX_SECTION_NUMERIC:
            continue

        inline = (m.group(2) or "").strip()
        start = m.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(body_text)
        chunk = body_text[start:end].strip()

        sections.append((sec_id, inline, chunk))

    return sections

def build_sections(toc_headings, raw_sections):
    """
    Convert raw splits into final section objects.
    Fixes:
    - empty text -> use inline (e.g., repealed notes)
    - tiny fragments -> merge into previous section
    """
    final = []
    def sort_key(sec_id: str):
        m = re.match(r"(\d+)([A-Z]{0,3})", sec_id)
        return (int(m.group(1)), m.group(2))

    # Deduplicate by keeping the longest chunk per sec_id (body can occasionally repeat)
    best = {}
    for sec_id, inline, chunk in raw_sections:
        text = chunk.strip()
        if sec_id not in best or len(text) > len(best[sec_id][1].strip()):
            best[sec_id] = (inline, text)

    for sec_id in sorted(best.keys(), key=sort_key):
        inline, text = best[sec_id]
        inline = (inline or "").strip()

        # If extracted text is empty, treat inline as the section text (covers repealed/reserved lines)
        if not text:
            text = inline

        # If still empty, leave empty (we'll report it)
        heading = toc_headings.get(sec_id)

        final.append({
            "chunk_id": safe_id(sec_id),
            "section_number": sec_id,
            "heading": heading,
            "text": text.strip()
        })

    # Merge micro-fragments that clearly look like extraction errors
    merged = []
    for s in final:
        t = (s["text"] or "").strip()
        if merged and len(t) < 25 and t.endswith(".") and s["section_number"] not in ("231",):
            # likely a tail fragment -> append to previous text
            merged[-1]["text"] = (merged[-1]["text"].rstrip() + "\n" + t).strip()
            # keep the section entry but mark it as empty-ish by turning it into a pointer note
            s["text"] = f"[See previous section text; extraction produced fragment: '{t}']"
            merged.append(s)
        else:
            merged.append(s)

    return merged

def write_report(sections, toc_headings):
    ids = [s["chunk_id"] for s in sections]
    dup = [k for k, v in Counter(ids).items() if v > 1]
    empty = [s["chunk_id"] for s in sections if not (s.get("text") or "").strip()]
    short = sorted(sections, key=lambda x: len((x.get("text") or "").strip()))[:15]

    numeric = sorted(int(s["section_number"]) for s in sections if re.fullmatch(r"\d+", s["section_number"]))
    gaps = []
    for a, b in zip(numeric, numeric[1:]):
        if b != a + 1:
            gaps.append((a, b))

    lines = []
    lines.append(f"PDF_PATH: {PDF_PATH}")
    lines.append(f"OUT_PATH: {OUT_PATH}")
    lines.append("")
    lines.append(f"TOC headings found: {len(toc_headings)}")
    lines.append(f"Output sections: {len(sections)}")
    lines.append(f"Duplicate chunk_id: {len(dup)}")
    if dup: lines.append("  " + ", ".join(dup[:10]))
    lines.append(f"Empty text sections: {len(empty)}")
    if empty: lines.append("  " + ", ".join(empty[:15]))
    lines.append("")
    if numeric:
        lines.append(f"Numeric min/max: {numeric[0]}..{numeric[-1]}")
        lines.append(f"Numeric gaps: {len(gaps)}")
        if gaps: lines.append(f"  Examples: {gaps[:10]}")
    lines.append("")
    lines.append("Shortest sections preview:")
    for s in short:
        t = (s.get("text") or "").replace("\n", " ").strip()
        lines.append(f"  {s['chunk_id']} ({s['section_number']}): len={len(t)} '{t[:120]}'")

    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")

def main():
    raw = normalize(extract_text(PDF_PATH))
    toc_start = find_toc_start(raw)
    body_start = find_body_start(raw)
    if toc_start is None or body_start is None:
        raise RuntimeError("Could not find TOC/body anchors.")

    toc_text = raw[toc_start:body_start]
    body_text = raw[body_start:]

    toc_headings = parse_toc_headings(toc_text)
    raw_sections = parse_body_sections(body_text)
    sections = build_sections(toc_headings, raw_sections)

    payload = {
        "doc_id": "guyana-constitution",
        "title": "Constitution of the Co-operative Republic of Guyana",
        "sections": sections
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    write_report(sections, toc_headings)

    print(f"Wrote {len(sections)} sections -> {OUT_PATH}")
    print(f"Report -> {REPORT_PATH}")

if __name__ == "__main__":
    main()