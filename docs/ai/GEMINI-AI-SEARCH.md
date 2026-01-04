# Gemini AI Search Implementation

## Overview

Integrate **Google Gemini AI** for intelligent legal search with voice input support. Users can ask questions in natural language and get answers with citations from the Constitution and Acts.

---

## Current Implementation (Jan 2026)

**What is live in the app now:**
- **Model:** `gemini-2.0-flash` via `@google/generative-ai`
- **Service:** `src/services/AIService.ts`
- **Retrieval flow:** Gemini keyword expansion -> stopword filtering -> FTS AND-first (OR fallback) -> Act title boost -> balanced Acts + Constitution context (top 12)
- **Tone routing:** Warm/supportive (domestic), formal/professional (criminal), friendly/brief (rights)
- **Citations:** Always `lawpal://open` deep links
- **Feedback:** Stored in `ai_feedback` (not yet used for prompt injection)
- **API key:** `src/config/apikey.ts` (client-side)

**Note:** The rest of this document includes roadmap items and alternative architectures that are **not** currently implemented (voice input, backend proxy, vector DB, etc.).

---

## Why Gemini?

**Advantages over other options:**
- ✅ **Free tier**: 15 requests/minute, 1500 requests/day
- ✅ **Large context**: 1M+ tokens (can process entire Constitution + Acts)
- ✅ **Multimodal**: Text, images, audio (for future voice search)
- ✅ **Function calling**: Can search specific Acts/sections
- ✅ **Fast**: 2-3 second responses
- ✅ **Grounding**: Can cite sources accurately
- ✅ **No separate vector DB needed**: Use Gemini's semantic search

---

## Architecture

### Option 1: Client-Side Gemini (Simplest)

```
User Question (Text/Voice)
    ↓
React Native App
    ↓
Extract relevant sections from SQLite (FTS5)
    ↓
Send to Gemini API (with context)
    ↓
Get AI response with citations
    ↓
Display in chat UI
```

**Pros:**
- ✅ No backend needed
- ✅ Works offline (uses local SQLite for search)
- ✅ Free (under 1500 requests/day)
- ✅ Simple implementation

**Cons:**
- ❌ API key exposed in app
- ❌ Rate limited per user
- ❌ Can't process all 460 Acts at once (context limits)

### Option 2: Backend + Gemini (Production Ready)

```
User Question
    ↓
React Native App
    ↓
Cloud Function / Node.js Backend
    ↓
Search SQLite/Vector DB
    ↓
Gemini API (with retrieved context)
    ↓
Response with citations
    ↓
App displays result
```

**Pros:**
- ✅ API key secured
- ✅ Better rate limiting
- ✅ Can implement caching
- ✅ Analytics on queries

**Cons:**
- ❌ Requires backend deployment
- ❌ Slight latency increase
- ❌ Backend hosting costs

---

## Implementation Plan (Option 1 - Client-Side)

### Phase 1: Setup Gemini SDK

```bash
npm install @google/generative-ai
npm install @react-native-voice/voice  # For voice input
npm install expo-speech                # For text-to-speech
```

### Phase 2: Create AI Service

**File: `src/services/geminiService.ts`**

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import DatabaseService from '../db/database';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

export interface AISearchResult {
  answer: string;
  citations: Citation[];
  confidence: 'high' | 'medium' | 'low';
}

export interface Citation {
  source: 'constitution' | 'act';
  doc_id: string;
  section_number: string;
  heading: string;
  text_snippet: string;
}

export class GeminiService {
  private model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',  // Fast, free tier friendly
  });

  async searchLegalQuestion(question: string): Promise<AISearchResult> {
    // Step 1: Use FTS5 to find relevant sections
    const relevantSections = await this.findRelevantSections(question);

    // Step 2: Build context for Gemini
    const context = this.buildContext(relevantSections);

    // Step 3: Create prompt
    const prompt = `You are a legal assistant for Guyana law. Answer the user's question based ONLY on the provided legal text. Always cite your sources with section numbers.

Legal Context:
${context}

User Question: ${question}

Provide:
1. A clear, concise answer
2. Citations to specific sections
3. Mention if you're uncertain

Format citations as: [Constitution Article X] or [Act Name Section Y]`;

    // Step 4: Call Gemini
    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    // Step 5: Parse response and extract citations
    return this.parseResponse(response, relevantSections);
  }

  private async findRelevantSections(query: string): Promise<any[]> {
    const db = DatabaseService;

    // Use SQLite FTS5 for fast semantic search
    const results = await db.db.getAllAsync(`
      SELECT
        s.doc_id,
        s.chunk_id,
        s.section_number,
        s.heading,
        s.text,
        d.title as doc_title,
        d.doc_type
      FROM sections_fts
      JOIN sections s ON sections_fts.rowid = s.rowid
      JOIN documents d ON s.doc_id = d.doc_id
      WHERE sections_fts MATCH ?
      ORDER BY rank
      LIMIT 10
    `, [query]);

    return results;
  }

  private buildContext(sections: any[]): string {
    return sections.map(s => `
[${s.doc_type === 'constitution' ? 'Constitution' : s.doc_title}]
Section ${s.section_number}: ${s.heading}
${s.text.substring(0, 500)}...
`).join('\n\n');
  }

  private parseResponse(response: string, sections: any[]): AISearchResult {
    // Extract citations from response
    // Match patterns like [Constitution Article 1] or [Act Name Section 5]
    const citationRegex = /\[(.*?)\]/g;
    const matches = [...response.matchAll(citationRegex)];

    const citations: Citation[] = matches.map(match => {
      // Find corresponding section
      const citationText = match[1];
      const section = sections.find(s =>
        citationText.includes(s.section_number) ||
        citationText.includes(s.heading)
      );

      if (section) {
        return {
          source: section.doc_type,
          doc_id: section.doc_id,
          section_number: section.section_number,
          heading: section.heading,
          text_snippet: section.text.substring(0, 200),
        };
      }
      return null;
    }).filter(Boolean) as Citation[];

    return {
      answer: response,
      citations,
      confidence: citations.length > 0 ? 'high' : 'medium',
    };
  }
}

export default new GeminiService();
```

### Phase 3: Create Chat UI

**File: `src/screens/AIAssistantScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text } from 'react-native';
import Voice from '@react-native-voice/voice';
import GeminiService from '../services/geminiService';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Get AI response
      const result = await GeminiService.searchLegalQuestion(inputText);

      // Add AI message
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: result.answer,
        citations: result.citations,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI search error:', error);
      // Add error message
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = async () => {
    try {
      if (isListening) {
        await Voice.stop();
        setIsListening(false);
      } else {
        await Voice.start('en-US');
        setIsListening(true);
      }
    } catch (error) {
      console.error('Voice error:', error);
    }
  };

  // Voice result handler
  React.useEffect(() => {
    Voice.onSpeechResults = (e) => {
      if (e.value && e.value[0]) {
        setInputText(e.value[0]);
        setIsListening(false);
      }
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={item.type === 'user' ? styles.userMessage : styles.aiMessage}>
      <Text style={styles.messageText}>{item.content}</Text>

      {/* Citations */}
      {item.citations && item.citations.length > 0 && (
        <View style={styles.citations}>
          {item.citations.map((citation, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.citationChip}
              onPress={() => {/* Navigate to source */}}
            >
              <Text style={styles.citationText}>
                📄 {citation.heading}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Chat Messages */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
      />

      {/* Loading Indicator */}
      {isLoading && <Text>AI is thinking...</Text>}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about Guyana law..."
          style={styles.input}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          onPress={handleVoiceInput}
          style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
        >
          <Text>🎤</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
          <Text>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

### Phase 4: Environment Configuration

**File: `.env`**
```bash
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

**Get API Key:**
1. Go to https://aistudio.google.com/app/apikey
2. Create new project
3. Generate API key
4. Add to `.env`

### Phase 5: Add to Navigation

**Update: `src/navigation/AppNavigator.tsx`**
```typescript
import AIAssistantScreen from '../screens/AIAssistantScreen';

// In Tab.Navigator
<Tab.Screen
  name="AI Assistant"
  component={AIAssistantScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="sparkles" size={size} color={color} />
    ),
  }}
/>
```

---

## Advanced Features

### 1. Voice-to-Voice
```typescript
import * as Speech from 'expo-speech';

// After getting AI response
Speech.speak(result.answer, {
  language: 'en-US',
  pitch: 1.0,
  rate: 0.9,
});
```

### 2. Conversation History
```typescript
// Store previous questions for context
const conversationHistory = messages.slice(-5); // Last 5 messages

// Include in Gemini prompt
const fullPrompt = `
Previous conversation:
${conversationHistory.map(m => `${m.type}: ${m.content}`).join('\n')}

New question: ${question}
`;
```

### 3. Suggested Questions
```typescript
const suggestedQuestions = [
  "What are my rights under Article 40?",
  "How do I adopt a child in Guyana?",
  "What are the requirements for marriage?",
  "Can I start a business in Guyana?",
];
```

### 4. Analytics
```typescript
// Track popular questions
import * as Analytics from 'expo-firebase-analytics';

Analytics.logEvent('ai_question_asked', {
  question_length: question.length,
  has_citations: citations.length > 0,
  response_time: responseTime,
});
```

---

## Cost Estimation

### Gemini Free Tier:
- **Limit**: 15 requests/minute, 1500 requests/day
- **Cost**: $0/month (free!)

### If You Exceed Free Tier:
- **Gemini 1.5 Flash**: $0.00001875/1K characters input, $0.000075/1K characters output
- **Example**: 10,000 queries/month with 500 chars context each
  - Input: 10K × 500 chars = 5M chars = $0.09
  - Output: 10K × 200 chars = 2M chars = $0.15
  - **Total: ~$0.25/month for 10K queries**

Extremely cheap compared to other options!

---

## Testing

```typescript
// Test query examples
const testQueries = [
  "What does Article 1 say?",
  "Can I vote if I'm 17 years old?",
  "How do I register a company?",
  "What are the marriage requirements?",
  "Can the president dissolve parliament?",
];

// Run tests
for (const query of testQueries) {
  const result = await GeminiService.searchLegalQuestion(query);
  console.log(`Q: ${query}`);
  console.log(`A: ${result.answer}`);
  console.log(`Citations: ${result.citations.length}`);
}
```

---

## Security Considerations

### Option 1: Client-Side (Quick Start)
- API key in `.env` file
- ⚠️ Exposed in app (can be extracted)
- ✅ Fine for MVP/testing
- ✅ Free tier limits abuse

### Option 2: Backend Proxy (Production)
- API key on server only
- Client calls your backend
- Backend calls Gemini
- ✅ Secure
- ❌ Requires server

**For now**: Start with Option 1, move to Option 2 before production launch.

---

## Next Steps

1. **Get Gemini API Key** (5 minutes)
2. **Install dependencies** (2 minutes)
3. **Create GeminiService** (30 minutes)
4. **Build AI Assistant screen** (1 hour)
5. **Add voice input** (30 minutes)
6. **Test with real queries** (30 minutes)
7. **Polish UI** (1 hour)

**Total time: ~4-5 hours**

---

## Implementation Priority

**This Week:**
1. ✅ Finish PDF build (in progress)
2. 🎯 Implement basic Gemini search (text-only)
3. 🎯 Create chat UI
4. 🎯 Add citations with tap-to-view

**Next Week:**
5. Add voice input
6. Add voice output (text-to-speech)
7. Implement conversation history
8. Add suggested questions

---

Ready to start implementing? I can:
1. Create the GeminiService file
2. Build the AI Assistant screen
3. Set up voice input
4. Wire it all together

Let me know when you want to begin!



