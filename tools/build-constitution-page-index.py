import json
import re
from pathlib import Path
from urllib.request import urlretrieve

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
CONSTANTS_PATH = ROOT / "src" / "constants" / "index.ts"
URLS_PATH = ROOT / "src" / "assets" / "acts-pdf-urls.json"
CONSTITUTION_JSON_PATH = ROOT / "src" / "assets" / "constitution.json"
OUTPUT_PATH = ROOT / "src" / "assets" / "constitution-page-index.json"
TMP_DIR = ROOT / "tools" / "tmp"
TMP_PDF_PATH = TMP_DIR / "constitution.pdf"

HEADER_FOOTER_PATTERNS = [
    r"^\s*LAWS OF GUYANA\s*$",
    r"^\s*Cap\.\s*\d+:\d+\s*$",
    r"^\s*CONSTITUTION OF THE CO-?OPERATIVE REPUBLIC OF GUYANA\s*$",
    r"^\s*CONSTITUTION OF THE COOPERATIVE REPUBLIC OF GUYANA\s*$",
    r"^\s*L\.R\.O\.\s*.*$",
    r"^\s*\d+\s*$",  # page number only
]
HEADER_FOOTER_RE = re.compile("|".join(f"(?:{p})" for p in HEADER_FOOTER_PATTERNS), re.IGNORECASE)


def normalize_text(text: str) -> str:
    text = re.sub(r"-\n(\w)", r"\1", text)  # join hyphenated line wraps
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def strip_headers_footers(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if HEADER_FOOTER_RE.match(line.strip()):
            continue
        lines.append(line)
    return "\n".join(lines)


def load_constitution_pdf_path() -> str:
    data = CONSTANTS_PATH.read_text(encoding="utf-8")
    match = re.search(r"CONSTITUTION_PDF_PATH\s*=\s*['\"]([^'\"]+)['\"]", data)
    if not match:
        raise RuntimeError("CONSTITUTION_PDF_PATH not found in constants.")
    return match.group(1)


def load_pdf_url(pdf_path: str) -> str:
    data = json.loads(URLS_PATH.read_text(encoding="utf-8"))
    urls = data.get("urls", data)
    if pdf_path not in urls:
        raise RuntimeError(f"PDF path not found in acts-pdf-urls.json: {pdf_path}")
    return urls[pdf_path]


def load_section_numbers() -> set[str]:
    data = json.loads(CONSTITUTION_JSON_PATH.read_text(encoding="utf-8"))
    return {str(section["section_number"]).upper() for section in data["sections"]}


def download_pdf(url: str) -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    safe_url = url.replace(" ", "%20")
    urlretrieve(safe_url, TMP_PDF_PATH)


def build_page_index() -> dict[str, int]:
    reader = PdfReader(str(TMP_PDF_PATH))
    section_numbers = load_section_numbers()
    page_index: dict[str, int] = {}
    body_started = False

    section_line_re = re.compile(r"^\s*(\d+[A-Z]{0,3})\.\s+")
    body_anchor_re = re.compile(r"(?m)^\s*1\.\s+Guyana\s+is\b")

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = normalize_text(text)
        text = strip_headers_footers(text)

        if not body_started and body_anchor_re.search(text):
            body_started = True

        if not body_started:
            continue

        for line in text.splitlines():
            match = section_line_re.match(line)
            if not match:
                continue

            section_id = match.group(1).upper()
            if section_id in section_numbers and section_id not in page_index:
                page_index[section_id] = page_number

    return page_index


def main() -> None:
    pdf_path = load_constitution_pdf_path()
    pdf_url = load_pdf_url(pdf_path)
    download_pdf(pdf_url)

    page_index = build_page_index()
    output = {
        "pdfPath": pdf_path,
        "pageCount": len(PdfReader(str(TMP_PDF_PATH)).pages),
        "sections": page_index,
    }

    OUTPUT_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote page index: {OUTPUT_PATH} ({len(page_index)} sections)")


if __name__ == "__main__":
    main()
