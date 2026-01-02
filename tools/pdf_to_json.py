import re
import json
from pathlib import Path
from collections import Counter
from pypdf import PdfReader  # pip install pypdf

ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "law_sources" / "constitution.pdf"
OUT_PATH = ROOT / "src" / "assets" / "constitution.json"
REPORT_PATH = ROOT / "tools" / "extractor_report.txt"

HEADER_FOOTER_PATTERNS = [
    r"^\s*LAWS OF GUYANA\s*$",
    r"^\s*Cap\.\s*\d+:\d+\s*$",
    r"^\s*CONSTITUTION OF THE CO-?OPERATIVE REPUBLIC OF GUYANA\s*$",
    r"^\s*CONSTITUTION OF THE COOPERATIVE REPUBLIC OF GUYANA\s*$",
    r"^\s*L\.R\.O\.\s*.*$",
    r"^\s*\d+\s*$",  # page number only
]
HEADER_FOOTER_RE = re.compile("|".join(f"(?:{p})" for p in HEADER_FOOTER_PATTERNS), re.IGNORECASE)

# Guard against TOC picking up "2000." (a year) as a section number.
# Constitution sections are nowhere near 1000.
MAX_SECTION_NUMERIC = 500

def extract_text(pdf_path: Path) -> str:
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    reader = PdfReader(str(pdf_path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)

def normalize_text(t: str) -> str:
    t = re.sub(r"-\n(\w)", r"\1", t)  # join hyphenated line wraps
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t

def strip_headers_footers(t: str) -> str:
    lines = []
    for line in t.splitlines():
        if HEADER_FOOTER_RE.match(line.strip()):
            continue
        lines.append(line)
    out = "\n".join(lines).strip()
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out

def find_toc_start(t: str):
    m = re.search(r"\bARRANGEMENT OF SECTIONS\b", t, re.IGNORECASE)
    return m.start() if m else None

def find_real_body_start(t: str):
    """
    Pick the CHAPTER I that is followed by the *real* section 1 line.
    TOC also has "CHAPTER I" and "1.", so we require:
      ^1\.  Guyana is
    """
    body_anchor = re.search(r"(?m)^\s*1\.\s+Guyana\s+is\b", t)
    if not body_anchor:
        return None

    # Walk backwards to the nearest "CHAPTER I" above it
    upto = t[:body_anchor.start()]
    chap_matches = list(re.finditer(r"\bCHAPTER\s+I\b", upto, flags=re.IGNORECASE))
    if not chap_matches:
        return body_anchor.start()

    return chap_matches[-1].start()

def parse_toc_headings(toc_text: str):
    """
    Extract TOC headings like '146. Something' and also '119A. Something'
    Returns { "146": "...", "119A": "..." }
    """
    headings = {}
    lines = [ln.strip() for ln in toc_text.splitlines()]
    lines = [ln for ln in lines if ln]

    # Allow lettered sections: 119A., 119B., etc.
    sec_line_re = re.compile(r"^(\d+[A-Z]{0,3})\.\s*(.+)$")

    cur = None
    parts = []

    for ln in lines:
        m = sec_line_re.match(ln)
        if m:
            if cur is not None:
                h = " ".join(parts).strip()
                h = re.sub(r"\s+\d+\s*$", "", h)  # strip trailing page number
                if h:
                    headings[cur] = h
            cur = m.group(1).strip()
            parts = [m.group(2).strip()]
        else:
            if cur is not None:
                parts.append(ln)

    if cur is not None:
        h = " ".join(parts).strip()
        h = re.sub(r"\s+\d+\s*$", "", h)
        if h:
            headings[cur] = h

    return headings

def safe_chunk_id(sec_id: str) -> str:
    # e.g. "119A" -> "sec-119A"
    # keep alphanumerics, remove weird characters just in case
    cleaned = re.sub(r"[^0-9A-Z]+", "", sec_id.upper())
    return f"sec-{cleaned}"

def parse_body_sections(body_text: str):
    """
    Parse body sections by lines like:
      146. ...
      119A. ...
    Keeps one best (longest) body chunk per section id.
    """
    # NOTE: allow lettered ids
    header_re = re.compile(r"(?m)^\s*(\d+[A-Z]{0,3})\.\s*(.*)\s*$")
    matches = list(header_re.finditer(body_text))
    if len(matches) < 50:
        raise RuntimeError("Not enough section headings detected in body; regex may need adjustment.")

    sections = {}
    for i, m in enumerate(matches):
        sec_id = m.group(1).strip().upper()

        # numeric guard (ignore years like 2000.)
        numeric_part = int(re.match(r"\d+", sec_id).group(0))
        if numeric_part > MAX_SECTION_NUMERIC:
            continue

        inline = m.group(2).strip()  # could be heading OR actual text like "[repealed...]"
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body_text)
        chunk = strip_headers_footers(body_text[start:end].strip())

        # If chunk is empty but inline has content, treat inline as TEXT (repealed/reserved/etc).
        # We'll use TOC later for heading if needed.
        heading_inline = inline or None
        text = chunk

        if not text and heading_inline:
            # If it looks like a repeal/reserved note, keep it as the section text.
            # Otherwise it's likely a heading; but an empty section is worse than preserving meaning.
            text = heading_inline
            heading_inline = None

        # If heading wasn't inline, sometimes it is first line of chunk
        if heading_inline is None and text:
            first = text.splitlines()[0].strip()
            if first and not re.match(r"^\(\d+\)", first) and len(first) < 140:
                heading_inline = first
                text = "\n".join(text.splitlines()[1:]).strip()

        prev = sections.get(sec_id)
        if prev is None or len(text) > len(prev["text"] or ""):
            sections[sec_id] = {"heading": heading_inline, "text": text}

    return sections

def build_output(toc_headings, body_sections):
    # Sort by numeric part then suffix (e.g. 119, 119A, 119B)
    def sort_key(sec_id: str):
        m = re.match(r"(\d+)([A-Z]{0,3})", sec_id)
        return (int(m.group(1)), m.group(2))

    merged = []
    for sec_id in sorted(body_sections.keys(), key=sort_key):
        body = body_sections[sec_id]
        heading = body.get("heading") or toc_headings.get(sec_id)
        text = (body.get("text") or "").strip()

        merged.append({
            "chunk_id": safe_chunk_id(sec_id),
            "section_number": sec_id,
            "heading": heading,
            "text": text
        })

    return {
        "doc_id": "guyana-constitution",
        "title": "Constitution of the Co-operative Republic of Guyana",
        "sections": merged
    }

def write_report(payload, toc_headings, body_sections, toc_start, toc_end, body_start):
    sections = payload["sections"]
    ids = [s["chunk_id"] for s in sections]
    dup_ids = [k for k, v in Counter(ids).items() if v > 1]

    empty = [s["chunk_id"] for s in sections if not (s.get("text") or "").strip()]
    short = [s["chunk_id"] for s in sections if len((s.get("text") or "").strip()) < 80]

    # numeric gaps check only on pure numeric sections
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
    lines.append(f"Body sections found: {len(body_sections)}")
    lines.append(f"Output sections: {len(sections)}")
    lines.append("")
    lines.append(f"TOC range: {toc_start}..{toc_end}")
    lines.append(f"Body start: {body_start}")
    lines.append("")
    lines.append(f"Duplicate chunk_id (should be 0): {len(dup_ids)}")
    if dup_ids:
        lines.append(f"  Examples: {dup_ids[:10]}")
    lines.append(f"Empty text sections: {len(empty)}")
    if empty:
        lines.append(f"  Examples: {empty[:15]}")
    lines.append(f"Very short text sections (<80 chars): {len(short)}")
    if short:
        lines.append(f"  Examples: {short[:15]}")
    lines.append("")
    if numeric:
        lines.append(f"Numeric section min/max: {numeric[0]}..{numeric[-1]}")
        lines.append(f"Numeric gaps found: {len(gaps)}")
        if gaps:
            lines.append(f"  Examples: {gaps[:15]}")
    else:
        lines.append("No numeric sections detected (unexpected).")

    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")

def main():
    raw = normalize_text(extract_text(PDF_PATH))

    toc_start = find_toc_start(raw)
    body_start = find_real_body_start(raw)

    if toc_start is None:
        raise RuntimeError("Could not find 'ARRANGEMENT OF SECTIONS'.")
    if body_start is None:
        raise RuntimeError("Could not find real body start (line '1. Guyana is ...').")

    toc_text = raw[toc_start:body_start]
    body_text = raw[body_start:]

    toc_headings = parse_toc_headings(toc_text)
    body_sections = parse_body_sections(body_text)
    payload = build_output(toc_headings, body_sections)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    write_report(payload, toc_headings, body_sections, toc_start, body_start, body_start)

    print(f"Wrote {len(payload['sections'])} unique body sections -> {OUT_PATH}")
    print(f"Report -> {REPORT_PATH}")

if __name__ == "__main__":
    main()