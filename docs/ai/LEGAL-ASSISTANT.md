# AI Legal Assistant - Implementation Guide

**Version:** 2.1 (Gemini 2.0 Flash - Retrieval + Tone Updates)
**Date:** January 3, 2026

## Overview

The AI Legal Assistant is a **Hybrid RAG (Retrieval-Augmented Generation)** system. It provides accurate, grounded legal information by bridging the gap between natural Guyanese language and formal Statute Law using local SQLite search plus Gemini synthesis.

## Architecture

The system uses a **multi-stage reasoning process** to ensure accuracy and relevance.

```mermaid
graph TD
    User[User Question] --> Exp[1. Keyword Expansion]
    Exp -->|Refined Terms| Search[2. Local SQLite FTS (AND then OR)]
    Search -->|Matches| Boost[3. Act Title Boost + Merge]
    Boost -->|Balanced Top Results| Synthesis[4. Grounded Synthesis + Tone]
    Synthesis -->|Response with Deep Links| UI[5. Interactive UI]
    UI --> Feedback[6. User Validation Loop]
```

### 1. The Knowledge Base (Local)
*   **Storage:** SQLite Database (`constitution.db`)
*   **Content:**
    *   Constitution of Guyana (931 Articles)
    *   459 Acts of Parliament (sections imported from chunked data)
*   **Indexing:** FTS5 (Full-Text Search 5)

### 2. The Intelligence Upgrades (V2.1)

#### A. Keyword Expansion + Stopword Filtering
Gemini expands the user's query into legal keywords, then the app removes overly generic legal fillers (e.g., "act", "order", "offence") before running search.

#### B. AND-first, OR-fallback FTS
FTS searches with a strict AND query first for precision, then falls back to OR if no results are found.

#### C. Act Title Boosting
If the user mentions an Act by name, the system adds a few sections from that Act to the context so it is not crowded out by Constitution hits.

#### D. Tone Routing
Responses adjust tone based on topic: warm/supportive for domestic cases, formal/professional for criminal matters, friendly/brief for rights questions.

#### E. Rate Limiting
Client-side throttling protects the API quota and prompts users to slow down when request volume is too high.

#### F. Cultural & Slang Calibration
The system includes a dedicated **Guyanese Legal Dictionary** mapping that translates local terms to formal law:
*   *"Child money"* -> Maintenance Act
*   *"Papers for land"* -> Deeds Registry / Transport
*   *"Lock up"* -> Fundamental Rights (Arrest/Detention)

#### F. Feedback Storage (Not Yet Used for Prompt Injection)
User ratings are stored in `ai_feedback` for analysis. These are not yet injected into prompts.

---

## Data Flow & Prompt Engineering

### Step 1: Keyword Expansion
Resolves slang and conversation history (pronouns/follow-ups) into legal keywords.

### Step 2: Retrieval + Boosting
1.  FTS search runs a strict AND query, then falls back to OR.
2.  If Act titles are detected, the system injects a few Act sections into the candidate pool.

### Step 3: Interactive Synthesis
The final response is generated with **Interactive Deep Links**.
*   **Format:** `[Source X](lawpal://open?docId=...&chunkId=...)`
*   **Result:** Constitution citations open the exact article in the Reader; Act citations open the Act PDF (page-specific mapping is pending).

---

## User Experience Features

| Feature | Implementation |
|---------|----------------|
| **Context Retention** | Tracks last 5 messages for natural follow-up questions. |
| **Suggested Questions** | AI generates 3 logical next steps as clickable chips. |
| **Feedback UI** | Thumbs Up (validates), Thumbs Down (flags), Flag (reports errors). |
| **Markdown Support** | High-readability formatting with bolding and headers. |
| **Tone Routing** | Topic-aware tone selection (domestic, criminal, rights). |
| **Conversational Style** | Avoids re-introducing itself in every response. |

---

## File Structure

| File | Purpose |
|------|---------|
| `src/services/AIService.ts` | The Reasoning Engine (Expansion, retrieval, tone-aware synthesis). |
| `src/screens/ChatScreen.tsx` | The UI (History, suggestions, deep-link handling). |
| `src/db/database.ts` | The Data Layer (FTS5 search, feedback persistence). |
| `src/db/migrations.ts` | Database schema updates (Migration 3: `ai_feedback` table). |

**Recent Additions (Jan 2026):**
- AND-first/OR-fallback search in `DatabaseService.search()`.
- Act title boosting via `searchDocumentsByTitle()` and `getSectionsForDocuments()`.
- Tone routing and conversational guidance in `AIService`.

---

## Future Roadmap

### 1. Vector Embeddings (Option 1 - Part 2)
*   Transition from "Re-ranking" to local vector embeddings for 100% offline semantic search.

### 2. Case Law Integration
*   Index Guyana High Court and CCJ judgments to provide judicial interpretation alongside statutes.

### 3. Voice-to-Voice
*   Full integration of Whisper (Speech-to-Text) and TTS for accessible legal aid.



