# Changelog

## 1.0.4 - 2026-01-03

- Centralize AI/UI/download limits in `APP_CONFIG`
- Add AI request rate limiting to protect quotas
- Add PDF download retry with backoff
- Move tooling-only deps (puppeteer, pdf-parse) to devDependencies
- Load Google AI API key from `.env` via app config

## 1.0.3 - 2026-01-03

- Add Home "Recent" section with resume support for Acts
- Track last-read page per Act PDF
- Show download status and "Downloaded only" filter in Acts list
- Remove unused legacy screen and ignore tools/tmp artifacts

## 1.0.2 - 2026-01-03

- Improve AI retrieval (AND/OR FTS, stopword filtering, Act title boost)
- Add tone routing and conversational guardrails
- Add Constitution PDF page index for page-accurate opens
- Update Home UI options/pinned scrolling behavior
- Add pin refresh on focus

## 1.0.1 - 2026-01-03

- Switch Acts PDF delivery to on-demand downloads with local caching
- Add PDF URL map for online sources
- Remove bundled PDFs from app assets to reduce install size
- Point Constitution PDF to the standard Acts filename

## 1.0.0 - 2026-01-01

- Initial release
