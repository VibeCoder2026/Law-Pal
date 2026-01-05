import { GoogleGenerativeAI } from '@google/generative-ai';
import { GOOGLE_AI_API_KEY } from '../config/apikey';
import DatabaseService from '../db/database';
import { APP_CONFIG } from '../constants';
import { SearchResult, Message } from '../types';

class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private requestTimestamps: number[] = [];

  constructor() {
    this.genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: APP_CONFIG.AI.TEMPERATURE, // Low temperature for factual legal answers
        topP: APP_CONFIG.AI.TOP_P,
        topK: APP_CONFIG.AI.TOP_K,
      }
    });
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    const windowMs = APP_CONFIG.AI.RATE_LIMIT_WINDOW_MS;
    const maxRequests = APP_CONFIG.AI.RATE_LIMIT_MAX_REQUESTS;

    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (this.requestTimestamps.length >= maxRequests) {
      return false;
    }

    this.requestTimestamps.push(now);
    return true;
  }

  private isGreeting(query: string): boolean {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;

    const greetings = [
      'hi',
      'hey',
      'hello',
      'yo',
      'sup',
      'hiya',
      'good morning',
      'good afternoon',
      'good evening',
      "what's up",
      'whats up',
      'how are you',
    ];

    return greetings.some((term) =>
      normalized === term || normalized.startsWith(`${term} `)
    );
  }

  private buildGreetingResponse(): string {
    const suggestions = [
      'What are my rights if I am arrested?',
      'How do I apply for a protection order?',
      'What does the Constitution say about freedom of speech?',
    ];

    return [
      "Hi! I can help with Guyana's Constitution and Acts.",
      'Tell me your situation or ask about a specific law.',
      '',
      '[SUGGESTIONS] ' + JSON.stringify(suggestions),
    ].join('\n');
  }

  private buildAiErrorResponse(message: string, hasResults: boolean): string {
    if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
      return 'The AI service rejected the API key. Please check the key on EAS (preview) or your local `.env`, then rebuild the app.';
    }

    if (message.includes('fetch') || message.includes('network') || message.includes('ENOTFOUND')) {
      return 'I could not reach the AI service. Please check your internet connection and try again.';
    }

    if (hasResults) {
      return 'I found related laws but could not generate a summary right now. Try again in a moment.';
    }

    return 'Sorry, I encountered an error while processing your request. Please try again later.';
  }

  private buildFallbackResultsResponse(results: SearchResult[]): string {
    const items = results.slice(0, 5).map((section, index) => {
      const capInfo = section.chapter ? `(Cap. ${section.chapter})` : '';
      const docTitle = section.doc_type === 'act'
        ? `${section.doc_title} ${capInfo}`.trim()
        : section.doc_title;
      const title = section.heading ? `${section.section_number} - ${section.heading}` : section.section_number;
      const link = `[Source ${index + 1}](lawpal://open?docId=${section.doc_id}&chunkId=${section.chunk_id})`;
      return `- ${docTitle} | Section ${title} ${link}`;
    });

    return [
      "I couldn't generate a summary right now, but here are the most relevant sections I found:",
      items.join('\n'),
      '',
      'If you want, ask a more specific question and I can try again.',
    ].join('\n');
  }

  /**
   * Expands the user's natural language query into specific legal keywords.
   * Considers history to resolve references (e.g. "what about my kids?" after "how to divorce?")
   */
  private async extractSearchKeywords(userQuery: string, history: Message[]): Promise<string> {
    const historyContext = history.length > 0 
      ? `\nPrevious Conversation:\n${history.map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n')}`
      : '';

    const prompt = `
You are a legal search optimizer for Guyana.
Task: Convert the user's query into 3-5 specific legal keywords or phrases found in Acts of Parliament.
Map slang to formal terms (e.g., "squatting" -> "prescriptive title adverse possession", "child money" -> "maintenance affiliation", "noise" -> "nuisance abatement").
Use the context of the conversation to resolve pronouns or follow-up questions.

${historyContext}
Current User Query: "${userQuery}"

Output Format: Just the keywords separated by spaces. No explanation.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const keywords = await result.response.text();
      return keywords.replace(/\n/g, ' ').trim();
    } catch (error) {
      console.warn('[AIService] Keyword extraction failed, using original query.');
      return userQuery;
    }
  }

  /**
   * Remove generic legal filler terms from AI-derived keywords.
   */
  private sanitizeKeywords(keywords: string): string {
    const genericTerms = new Set([
      'act',
      'acts',
      'law',
      'laws',
      'legal',
      'section',
      'sections',
      'order',
      'orders',
      'offence',
      'offences',
      'person',
      'persons',
      'court',
      'chapter',
      'cap',
      'regulation',
      'regulations',
      'provision',
      'provisions',
      'schedule',
      'schedules',
    ]);

    const tokens = keywords
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((term) => term.length >= 3 && !genericTerms.has(term));

    return Array.from(new Set(tokens)).join(' ');
  }

  /**
   * Determine response tone based on user query intent.
   */
  private determineTone(query: string): 'friendly_brief' | 'warm_supportive' | 'formal_professional' {
    const q = query.toLowerCase();

    const domesticSignals = [
      'domestic violence',
      'family violence',
      'protection order',
      'restraining order',
      'abuse',
      'abusive',
      'spouse',
      'husband',
      'wife',
      'partner',
      'boyfriend',
      'girlfriend',
      'custody',
      'visitation',
      'maintenance',
      'child support',
      'divorce',
      'separation',
      'alimony',
      'intimate',
    ];

    const criminalSignals = [
      'crime',
      'criminal',
      'charge',
      'charged',
      'arrest',
      'bail',
      'prosecution',
      'conviction',
      'sentence',
      'imprisonment',
      'fine',
      'murder',
      'homicide',
      'manslaughter',
      'robbery',
      'theft',
      'assault',
      'battery',
      'fraud',
      'drug',
      'narcotic',
      'firearm',
      'weapon',
      'rape',
      'sexual offence',
      'sexual offense',
    ];

    const rightsSignals = [
      'fundamental rights',
      'rights',
      'freedom',
      'equality',
      'constitution',
      'bill of rights',
      'discrimination',
      'privacy',
      'speech',
      'expression',
    ];

    if (domesticSignals.some((term) => q.includes(term))) {
      return 'warm_supportive';
    }

    if (criminalSignals.some((term) => q.includes(term))) {
      return 'formal_professional';
    }

    if (rightsSignals.some((term) => q.includes(term))) {
      return 'friendly_brief';
    }

    return 'friendly_brief';
  }

  /**
   * Generates an answer to the user's query using the Constitution and Acts as context.
   */
  async generateAnswer(query: string, history: Message[] = []): Promise<string> {
    if (this.isGreeting(query)) {
      return this.buildGreetingResponse();
    }

    if (!GOOGLE_AI_API_KEY || (GOOGLE_AI_API_KEY as string) === 'YOUR_API_KEY_HERE') {
      return 'Please configure GOOGLE_AI_API_KEY in your `.env` (local) or EAS environment (preview) to use chat.';
    }

    try {
      if (!this.canMakeRequest()) {
        return "You're sending requests too quickly. Please wait a moment and try again.";
      }
      // 1. Query Expansion (The "Guyanese Translator")
      const legalKeywords = await this.extractSearchKeywords(query, history);
      const refinedKeywords = this.sanitizeKeywords(legalKeywords);
      console.log(`[AIService] Expanded Query: "${query}" -> "${legalKeywords}"`);
      if (refinedKeywords && refinedKeywords !== legalKeywords) {
        console.log(`[AIService] Refined Keywords: "${refinedKeywords}"`);
      }

      // 2. Search for relevant sections in the database
      // We search with the expanded keywords which are specifically tailored for retrieval
      const searchQuery = refinedKeywords || legalKeywords || query;
      const searchResults = await DatabaseService.search(searchQuery, {
        limit: APP_CONFIG.AI.SEARCH_RESULTS_LIMIT,
      });
      
      // If no results, try original query
      let finalResults = searchResults;
      if (searchResults.length === 0) {
        console.log('[AIService] No results for keywords, trying original query...');
        finalResults = await DatabaseService.search(query, {
          limit: APP_CONFIG.AI.SEARCH_RESULTS_LIMIT,
        });
      }

      // 2b. Boost Act-specific queries by matching Act titles
      const titleMatches = await DatabaseService.searchDocumentsByTitle(query, 5);
      if (titleMatches.length > 0) {
        const docIds = titleMatches.map((match) => match.doc_id);
        const boostedSections = await DatabaseService.getSectionsForDocuments(docIds, 3);
        if (boostedSections.length > 0) {
          const seen = new Set<string>();
          finalResults = [...boostedSections, ...finalResults].filter((item) => {
            const key = `${item.doc_id}:${item.chunk_id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
      }

      console.log(`[AIService] Found ${finalResults.length} results`);

      // 3. Select top results for context (balance Constitution + Acts)
      const indexedResults = finalResults.map((result, index) => ({ result, index }));
      const actResults = indexedResults.filter((item) => item.result.doc_type === 'act');
      const constitutionResults = indexedResults.filter(
        (item) => item.result.doc_type !== 'act'
      );

      const targetSize = APP_CONFIG.AI.CONTEXT_SIZE;
      const halfTarget = Math.max(1, Math.floor(targetSize / 2));
      const actQuota = Math.min(halfTarget, actResults.length);
      const constitutionQuota = Math.min(halfTarget, constitutionResults.length);

      const selected: Array<{ result: typeof finalResults[number]; index: number }> = [
        ...actResults.slice(0, actQuota),
        ...constitutionResults.slice(0, constitutionQuota),
      ];

      const selectedIndices = new Set(selected.map((item) => item.index));
      if (selected.length < targetSize) {
        for (const item of indexedResults) {
          if (!selectedIndices.has(item.index)) {
            selected.push(item);
            selectedIndices.add(item.index);
            if (selected.length >= targetSize) break;
          }
        }
      }

      const topResults = selected
        .sort((a, b) => a.index - b.index)
        .map((item) => item.result);

      if (topResults.length === 0) {
        return "I couldn't find any specific laws matching your situation in my database. It's possible this matter is governed by Common Law or a specific Act I haven't indexed yet. I recommend consulting with a qualified attorney in Guyana.";
      }

      // 4. Construct the prompt with History and Context
      const contextText = topResults.map((section, index) => {
        const capInfo = section.chapter ? `(Cap. ${section.chapter})` : '';
        const docDisplayTitle = section.doc_type === 'act' ? `${section.doc_title} ${capInfo}` : section.doc_title;
        const title = section.heading ? `${section.section_number} - ${section.heading}` : section.section_number;
        
        // We include a hidden metadata tag for the AI to use in its response
        return `[Source ${index + 1}] (ID: ${section.doc_id}|${section.chunk_id}) ${docDisplayTitle} | Section ${title}:\n${section.text}`;
      }).join('\n\n');

      const historyText = history.slice(-5).map(m =>
        `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`
      ).join('\n');

      const tone = this.determineTone(query);
      const toneGuide = {
        friendly_brief:
          'Friendly and brief. Use plain language, short paragraphs, and keep it concise.',
        warm_supportive:
          'Warm and supportive. Use gentle, empathetic language and a reassuring tone without being overly verbose.',
        formal_professional:
          'Formal and professional. Use precise wording and structured paragraphs.',
      }[tone];

      const systemInstruction = `
You are Law Pal 🇬🇾, an expert legal assistant for the **Laws of Guyana**.
Your mission is to provide accurate, grounded, and helpful legal information to Guyanese citizens.

**Strict Grounding Rules:**
1. **Source Fidelity:** Base your answer ONLY on the provided Context. If the context doesn't contain the answer, explicitly state what you do know and where the gaps are.
2. **Interactive Citations:** Every factual claim MUST be followed by a citation using the metadata ID provided in the context, in the format: [Source X](lawpal://open?docId=...&chunkId=...). 
   Example: "...as per Article 40 [Source 1](lawpal://open?docId=constitution&chunkId=article_40)."
3. **Guyana Context:** Use Guyanese terminology. The Constitution is supreme (Article 8).
4. **No Hallucinations:** Do not invent Acts, Sections, or legal principles not present in the Context.
5. **Professional Disclaimer:** Always include a brief note that you are an AI and this is not professional legal advice.
6. **No Pre-trained knowledge:** Do not use your internal knowledge about other countries' laws.

**Tone & Style:**
- ${toneGuide}
- Be conversational, not robotic. If the user is vague, ask one short clarifying question while still answering what you can from the Context.
- For sensitive situations, be kind and calm. If there is immediate danger, suggest contacting local emergency services (do not provide numbers).
- Do not reintroduce yourself or repeat "Law Pal" in each response; assume the greeting was already shown in the UI.

**Conversation History:**
${historyText}

**Current Legal Context:**
${contextText}

**User Question:** ${query}

Answer clearly and concisely using Markdown. Ensure all citations use the 'lawpal://open' link format so the user can tap them.

Finally, provide 3 short suggested follow-up questions that the user might want to ask next, based on the context. Format them as a JSON array at the very end of your response, like this:
[SUGGESTIONS] ["Question 1?", "Question 2?", "Question 3?"]
`;

      // 5. Call Gemini API
      try {
        const result = await this.model.generateContent(systemInstruction);
        const response = await result.response;
        const responseText = response.text();
        return responseText;
      } catch (error: any) {
        const message = String(error?.message || error || '');
        console.error('[AIService] Error generating answer:', error);
        if (topResults.length > 0) {
          return [
            this.buildAiErrorResponse(message, true),
            '',
            this.buildFallbackResultsResponse(topResults),
          ].join('\n');
        }
        return this.buildAiErrorResponse(message, false);
      }
    } catch (error) {
      console.error('[AIService] Error generating answer:', error);
      return 'Sorry, I encountered an error while processing your request. Please try again later.';
    }
  }

  /**
   * Submits user feedback (Thumbs Up/Down/Flag) for an AI response.
   * rating: 1 (Up), -1 (Down), 0 (Flag), undefined/null (Unselected)
   */
  async submitFeedback(query: string, response: string, rating: 1 | -1 | 0 | undefined | null, metadata: any = {}): Promise<void> {
    try {
      const db = DatabaseService.db;
      if (!db) {
        console.warn('[AIService] Database not initialized, cannot save feedback');
        return;
      }

      // If rating is undefined, we use a special value (e.g., 2) to indicate "unselected/neutral"
      const ratingValue = (rating === undefined || rating === null) ? 2 : rating;

      const metadataStr = JSON.stringify({
        ...metadata,
        timestamp: new Date().toISOString(),
        model: 'gemini-2.0-flash',
      });

      await db.runAsync(
        'INSERT INTO ai_feedback (query, response, rating, metadata) VALUES (?, ?, ?, ?)',
        [query, response, ratingValue, metadataStr]
      );
      
      console.log(`[AIService] Feedback updated: rating=${ratingValue} for query="${query.substring(0, 30)}..."`);
    } catch (error) {
      console.error('[AIService] Error saving feedback:', error);
    }
  }
}

export default new AIService();
