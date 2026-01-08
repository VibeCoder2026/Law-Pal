# Context Management Best Practices

**Purpose:** Strategies to maintain project knowledge across long development sessions with AI assistants

---

## Problem: Context Loss

**Why it happens:**
- AI conversations have token limits (context windows)
- Sessions end and start fresh
- Multiple developers/collaborators join project
- Time gaps between work sessions
- Complex projects span weeks/months

**What gets lost:**
- Setup steps taken
- Configuration changes
- Build errors encountered and fixed
- Architecture decisions
- Workarounds implemented
- Deployment procedures

---

## Solution: Documentation-First Development

### ✅ YES: Use Markdown Files (.md)

**Why Markdown is excellent for context:**
- ✅ Human-readable (developers can scan quickly)
- ✅ AI-friendly (LLMs parse markdown well)
- ✅ Version controlled (git tracks changes)
- ✅ Searchable (grep/find works)
- ✅ Portable (works everywhere)
- ✅ Zero tooling required (any text editor)

### ❌ Avoid These for Context

**Don't rely on:**
- ❌ Chat history alone (gets lost)
- ❌ Comments in code (scattered, hard to find)
- ❌ Memory/mental notes (not shareable)
- ❌ Screenshots without text (not searchable)
- ❌ Video recordings (slow to review)
- ❌ Notion/Confluence (requires account, may be slow)

---

## Recommended Documentation Structure

### Essential Files (Always Create These)

#### 1. **README.md** - Project Overview
```markdown
# Project Name

Brief description (1-2 sentences)

## Quick Start
npm install
npx expo start

## Key Features
- Feature 1
- Feature 2

## Tech Stack
- React Native + Expo
- SQLite
- Google Gemini AI

## Documentation
- [Setup Guide](../build/LOCAL-DEV-SETUP.md)
- [Build Instructions](../build/BUILD-INSTRUCTIONS.md)
```

#### 2. **docs/SETUP.md** - Environment Setup
```markdown
# Development Setup

## Prerequisites
- Node.js 18+
- Java 21
- Android Studio

## Installation
1. Clone repo
2. npm install
3. Configure .env

## Environment Variables
  EXPO_PUBLIC_AI_PROXY_URL=https://your-worker-url.workers.dev
  ANDROID_HOME=path_to_sdk
  ```

#### 3. **ARCHITECTURE.md** - System Design
```markdown
# Architecture Overview

## Database Schema
[Describe tables, indexes]

## Service Layer
- AIService: Handles Gemini API
- DatabaseService: SQLite operations

## Data Flow
User → ChatScreen → AIService → Gemini API → Response
```

#### 4. **docs/CHANGELOG.md** - What Changed When
```markdown
# Changelog

## 2026-01-01
- Added local dev build setup
- Configured Android SDK
- Set up hot reload

## 2025-12-30
- Implemented Gemini AI search
- Added PDF viewer
```

---

## Our Project Documentation Strategy

### What We've Created

1. **[README.md](../../README.md)** - Project overview, quick start
2. **[BUILD-INSTRUCTIONS.md](../build/BUILD-INSTRUCTIONS.md)** - EAS build guide
3. **[LOCAL-DEV-SETUP.md](../build/LOCAL-DEV-SETUP.md)** - Local development setup
4. **[LOCAL-BUILD-SETUP-LOG.md](../build/LOCAL-BUILD-SETUP-LOG.md)** - Setup session log (this session)
5. **[CURRENT-STATUS.md](CURRENT-STATUS.md)** - Current project state
6. **[GEMINI-AI-SEARCH.md](../ai/GEMINI-AI-SEARCH.md)** - AI implementation plan
7. **[APP-SIZE-OPTIMIZATION.md](../build/APP-SIZE-OPTIMIZATION.md)** - Size reduction strategies
8. **[ACTS-DATABASE-SCHEMA.md](../data/ACTS-DATABASE-SCHEMA.md)** - Database structure
9. **[HIERARCHY-STRUCTURE.md](../data/HIERARCHY-STRUCTURE.md)** - Data organization
10. **[MIGRATION-PLAN.md](../migrations/MIGRATION-PLAN.md)** - Database migration guide

### Document Types We Use

#### **Setup Logs** (Session-based)
- **Purpose:** Record what was done in a specific session
- **Example:** `LOCAL-BUILD-SETUP-LOG.md`
- **When:** After significant setup/configuration work
- **Content:**
  - Commands run
  - Environment variables set
  - Errors encountered and fixed
  - Verification steps
  - Troubleshooting notes

#### **Implementation Plans** (Forward-looking)
- **Purpose:** Design document before building
- **Example:** `GEMINI-AI-SEARCH.md`
- **When:** Before implementing complex features
- **Content:**
  - Architecture options
  - Technology choices
  - Code examples
  - Cost analysis
  - Timeline estimates

#### **Status Documents** (Current state)
- **Purpose:** Snapshot of project at a point in time
- **Example:** `CURRENT-STATUS.md`
- **When:** After major milestones
- **Content:**
  - What's completed
  - What's in progress
  - What's pending
  - Known issues
  - Next steps

#### **How-To Guides** (Procedural)
- **Purpose:** Step-by-step instructions
- **Example:** `LOCAL-DEV-SETUP.md`
- **When:** For repeatable processes
- **Content:**
  - Prerequisites
  - Step-by-step commands
  - Expected output
  - Troubleshooting
  - Quick reference

#### **Analysis Documents** (Problem-solving)
- **Purpose:** Investigate issues or options
- **Example:** `APP-SIZE-OPTIMIZATION.md`
- **When:** When facing tradeoffs or problems
- **Content:**
  - Problem statement
  - Multiple approaches
  - Pros/cons
  - Recommendation
  - Implementation steps

---

## Best Practices for Context Retention

### 1. Document After, Not Before

**Do this:**
```
1. Complete setup
2. Document what you did
3. Include exact commands and errors
```

**Not this:**
```
1. Plan to document
2. Forget details
3. Try to remember later (fails)
```

### 2. Use Descriptive File Names

**Good:**
- `GEMINI-AI-SEARCH.md` (clear purpose)
- `LOCAL-BUILD-SETUP-LOG.md` (specific topic)
- `APP-SIZE-OPTIMIZATION.md` (exact problem)

**Bad:**
- `notes.md` (too vague)
- `temp.md` (will be lost)
- `stuff.md` (meaningless)

### 3. Include Commands Verbatim

**Good:**
```markdown
## Set Environment Variable
\`\`\`bash
setx ANDROID_HOME "C:\Users\keoma\AppData\Local\Android\Sdk"
\`\`\`

Expected output:
\`\`\`
SUCCESS: Specified value was saved.
\`\`\`
```

**Bad:**
```markdown
Set the Android home variable.
```

### 4. Document Errors and Solutions

**Good:**
```markdown
### Error: "adb not found"

**Cause:** PATH not set

**Solution:**
\`\`\`bash
$env:PATH = "$env:PATH;C:\Users\keoma\AppData\Local\Android\Sdk\platform-tools"
\`\`\`
```

**Bad:**
```markdown
Fixed adb issue.
```

### 5. Use Tables for Comparisons

**Good:**
```markdown
| Approach | Pros | Cons |
|----------|------|------|
| EAS Build | Clean | Slow (15 min) |
| Local Build | Fast (2 sec) | Setup required |
```

**Bad:**
```
EAS is clean but slow. Local is fast but needs setup.
```

### 6. Link Related Docs

**Good:**
```markdown
See also:
- [BUILD-INSTRUCTIONS.md](../build/BUILD-INSTRUCTIONS.md) - EAS builds
- [LOCAL-DEV-SETUP.md](../build/LOCAL-DEV-SETUP.md) - Local setup
```

**Bad:**
```
Check other docs for more info.
```

---

## Prompting AI with Context

### When Starting a New Session

**Bad prompt:**
```
"Continue where we left off"
```
Problem: AI doesn't know what "we" did.

**Good prompt:**
```
"Read CURRENT-STATUS.md and LOCAL-BUILD-SETUP-LOG.md.
The local build is currently running (started at 12:00 PM).
I want to add voice input to the chat screen next.
What files do I need to modify?"
```

### When Encountering Errors

**Bad:**
```
"It's not working"
```

**Good:**
```
"I'm following LOCAL-DEV-SETUP.md step 3.
When I run 'npx expo run:android', I get this error:
[paste full error]

My environment:
- Java version: 21.0.8
- ANDROID_HOME: C:\Users\keoma\AppData\Local\Android\Sdk
- adb devices shows: emulator-5554

What's wrong?"
```

### When Resuming Work

**Bad:**
```
"What should I do next?"
```

**Good:**
```
"According to CURRENT-STATUS.md, we completed:
1. ✅ PDF viewer
2. ✅ Gemini AI integration
3. ✅ Local dev build setup

Next up is testing the AI chat.
Where is the chat screen code, and what test questions should I try?"
```

---

## File Naming Conventions

### Purpose-Based Naming

```
{TOPIC}-{TYPE}.md

Examples:
GEMINI-AI-SEARCH.md          (Topic: Gemini, Type: Search)
LOCAL-BUILD-SETUP-LOG.md     (Topic: Local Build, Type: Setup Log)
APP-SIZE-OPTIMIZATION.md     (Topic: App Size, Type: Optimization)
```

### Date-Based Naming (for logs)

```
{YYYY-MM-DD}-{TOPIC}.md

Examples:
2026-01-01-LOCAL-BUILD-SESSION.md
2025-12-30-GEMINI-INTEGRATION.md
```

### Avoid

- Generic names: `notes.md`, `todo.md`, `temp.md`
- Version numbers: `setup-v2.md` (use git for versioning)
- Developer names: `keoma-notes.md` (team should share docs)

---

## Maintaining Documentation

### Update Frequency

**Update immediately:**
- Setup logs (right after setup)
- Error solutions (when you fix them)
- Status docs (after completing milestones)

**Update regularly:**
- README (when features change)
- Architecture docs (when design changes)
- Troubleshooting (as issues arise)

**Update rarely:**
- Changelog (at releases)
- Initial setup guides (stable after first draft)

### What to Delete

**Remove when:**
- ❌ Temporary notes after incorporating into proper docs
- ❌ Outdated solutions that no longer apply
- ❌ Duplicated information (consolidate)
- ❌ Experimental ideas that were rejected

**Keep:**
- ✅ Setup logs (historical record)
- ✅ Implementation plans (show reasoning)
- ✅ Error solutions (may recur)
- ✅ Architecture decisions (explain current state)

---

## Tools and Workflows

### Version Control Integration

```bash
# Commit docs with related code changes
git add src/services/AIService.ts GEMINI-AI-SEARCH.md
git commit -m "Implement Gemini AI search (see GEMINI-AI-SEARCH.md)"

# Tag major milestones
git tag -a v1.0.0 -m "Initial release with AI chat"
git push --tags
```

### Documentation in Pull Requests

```markdown
## PR Description

**What:** Added voice input to chat

**Why:** Users requested hands-free operation

**How:** See [VOICE-INPUT-IMPLEMENTATION.md](VOICE-INPUT-IMPLEMENTATION.md)

**Testing:**
1. Run `npx expo start --dev-client`
2. Open chat screen
3. Tap microphone icon
4. Speak: "What are my rights?"

**Docs Updated:**
- [x] CURRENT-STATUS.md (added voice input to features)
- [x] README.md (updated dependencies)
- [x] docs/CHANGELOG.md (logged change)
```

### README Index

Keep README.md as central index:

```markdown
# Law Pal GY

## Documentation

### Getting Started
- [Setup Guide](../build/LOCAL-DEV-SETUP.md)
- [Build Instructions](../build/BUILD-INSTRUCTIONS.md)

### Development
- [Architecture](ARCHITECTURE.md)
- [Database Schema](../data/ACTS-DATABASE-SCHEMA.md)

### Features
- [Gemini AI Search](../ai/GEMINI-AI-SEARCH.md)
- [PDF Viewer](../data/PDF-VIEWER-IMPLEMENTATION.md)

### Operations
- [Optimization](../build/APP-SIZE-OPTIMIZATION.md)
- [Troubleshooting](TROUBLESHOOTING.md)

### History
- [Changelog](../CHANGELOG.md)
- [Setup Logs](logs/)
```

---

## Example: Starting a New Feature

### 1. Create Implementation Plan

**File:** `VOICE-INPUT-FEATURE.md`
```markdown
# Voice Input Implementation

## Goal
Add voice input to chat screen for hands-free queries

## Dependencies
- @react-native-voice/voice (npm package)

## Implementation Steps
1. Install package
2. Request microphone permissions
3. Add voice button to ChatScreen
4. Handle voice events
5. Update input text with transcription

## Files to Modify
- src/screens/ChatScreen.tsx
- app.json (permissions)
- package.json

## Testing Plan
- Test on real device (emulator has no mic)
- Test offline voice recognition
- Test error handling
```

### 2. Implement Feature

```bash
npm install @react-native-voice/voice
# Edit files...
```

### 3. Document Results

**File:** `VOICE-INPUT-SETUP-LOG.md`
```markdown
# Voice Input Setup Log

## Date: 2026-01-02

## Commands Run
\`\`\`bash
npm install @react-native-voice/voice
npx expo run:android  # Rebuild for native module
\`\`\`

## Files Modified
- src/screens/ChatScreen.tsx (added voice button, event handlers)
- app.json (added RECORD_AUDIO permission)

## Testing
✅ Voice button appears
✅ Microphone permission requested
✅ Speech recognized correctly
✅ Transcription updates input field

## Issues Encountered
- Initial error: "Voice module not found"
- Solution: Needed rebuild (npx expo run:android)

## Next Steps
- Add text-to-speech for responses
- Add voice activity indicator
```

### 4. Update Status

**In `CURRENT-STATUS.md`:**
```markdown
## ✅ Completed Features

### Voice Input (Added 2026-01-02)
- Speech-to-text for chat queries
- Microphone permission handling
- See: [VOICE-INPUT-SETUP-LOG.md](VOICE-INPUT-SETUP-LOG.md)
```

---

## Context Checklist

Before ending a session, ensure you have:

- [ ] Documented new setup steps (if any)
- [ ] Logged errors and solutions
- [ ] Updated CURRENT-STATUS.md with progress
- [ ] Added next steps to status doc
- [ ] Committed docs alongside code changes
- [ ] Linked related documentation
- [ ] Added troubleshooting notes

---

## Summary

### ✅ Use Markdown Files Because:
1. **Human-readable** - Fast to scan
2. **AI-parseable** - LLMs understand well
3. **Version-controlled** - Git tracks changes
4. **Searchable** - grep/find works
5. **Universal** - Works everywhere
6. **Low-friction** - Any text editor
7. **Portable** - No lock-in

### 📝 Document Types to Create:
1. **Setup logs** - What you did (this session)
2. **Implementation plans** - What you'll do (future)
3. **Status docs** - Where you are (current)
4. **How-to guides** - How to repeat (procedures)
5. **Analysis docs** - Why you chose (decisions)

### 🎯 Best Practices:
1. Document **after** doing (capture exact commands)
2. Include **errors and solutions** (they'll recur)
3. Use **tables and code blocks** (clarity)
4. Link **related docs** (navigation)
5. Update **status regularly** (current state)
6. Keep **README as index** (entry point)

### 💡 When Prompting AI:
1. Reference specific docs: "Read CURRENT-STATUS.md"
2. Provide context: "We're at step 3 of LOCAL-DEV-SETUP.md"
3. Include environment details: "Java 21, Android SDK"
4. Paste full errors, not summaries

---

**TL;DR:** Yes, markdown files are the best practice. They're readable, searchable, versionable, and AI-friendly. We've created 10+ docs for this project and they're invaluable for maintaining context across sessions.




