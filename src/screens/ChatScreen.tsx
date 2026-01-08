import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import RenderHTML from 'react-native-render-html';
import { marked } from 'marked';
import AIService from '../services/AIService';
import DatabaseService from '../db/database';
import { Message } from '../types';
import { getActMetadataById, getActPdfPath } from '../utils/actsMetadata';

marked.setOptions({
  breaks: true,
  mangle: false,
  headerIds: false,
});

const ChatScreen = ({ navigation }: any) => {
  const { colors, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const htmlBaseStyle = useMemo(
    () => ({ color: colors.text, fontSize: 16, lineHeight: 22 }),
    [colors.text]
  );
  const htmlTagsStyles = useMemo(
    () => ({
      p: { color: colors.text, marginTop: 0, marginBottom: 8 },
      h1: { color: colors.text, fontWeight: 'bold', marginBottom: 8 },
      h2: { color: colors.text, fontWeight: 'bold', marginBottom: 8 },
      h3: { color: colors.text, fontWeight: 'bold', marginBottom: 8 },
      strong: { fontWeight: 'bold', color: colors.text },
      a: { color: colors.accent },
      blockquote: {
        backgroundColor: 'transparent',
        borderLeftColor: colors.border,
        borderLeftWidth: 2,
        paddingLeft: 8,
      },
      code: { backgroundColor: 'transparent' },
      pre: { backgroundColor: 'transparent' },
      li: { color: colors.text },
    }),
    [colors.text, colors.accent, colors.border]
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Hello! I'm your Law Pal 🇬🇾 assistant. Ask me any question about the Constitution or Acts, and I'll search the legal database to find the answer for you.",
      sender: 'bot',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async (text?: string) => {
    const messageText = typeof text === 'string' ? text : inputText;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText.trim(),
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (typeof text !== 'string') setInputText('');
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const responseText = await AIService.generateAnswer(userMessage.text, messages);
      
      // Extract suggestions if they exist
      let cleanText = responseText;
      let suggestions: string[] = [];

      // Try multiple patterns to extract suggestions

      // Pattern 1: [SUGGESTIONS] marker with JSON array
      let suggestionMatch = responseText.match(/\[SUGGESTIONS\]\s*(?:```json)?\s*(\[[\s\S]*?\])\s*(?:```)?/);

      // Pattern 2: Standalone JSON array in code block at the end
      if (!suggestionMatch) {
        suggestionMatch = responseText.match(/```(?:json)?\s*(\[\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*\])\s*```\s*$/);
      }

      // Pattern 3: Just a JSON array at the very end
      if (!suggestionMatch) {
        suggestionMatch = responseText.match(/(\[\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*\])\s*$/);
      }

      if (suggestionMatch) {
        try {
          const jsonStr = suggestionMatch[1].trim();
          suggestions = JSON.parse(jsonStr);
          // Remove the suggestions from the clean text
          cleanText = responseText.replace(suggestionMatch[0], '').trim();
        } catch (e) {
          console.warn('[ChatScreen] Failed to parse suggestions:', e);
        }
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: cleanText,
        sender: 'bot',
        timestamp: Date.now(),
        suggestions: suggestions,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error. Please try again.",
        sender: 'bot',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleFeedback = async (messageId: string, rating: 1 | -1 | 0) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const botMessage = messages[messageIndex];
    // Find the corresponding user query (should be the message before)
    const userQuery = messages[messageIndex - 1]?.text || '';

    // Toggle: If clicking the same rating, unselect it (set to undefined)
    const nextRating = botMessage.rating === rating ? undefined : rating;

    // Update local state to show active state
    const newMessages = [...messages];
    newMessages[messageIndex] = { ...botMessage, rating: nextRating };
    setMessages(newMessages);

    // Persist to database
    await AIService.submitFeedback(userQuery, botMessage.text, nextRating);
  };

  const handleCitationPress = useCallback(async (docId: string, chunkId: string) => {
    if (__DEV__) {
      console.log('[ChatScreen] Citation pressed - docId:', docId, 'chunkId:', chunkId);
    }
    try {
      // Get document details to determine if it's Constitution or Act
      const document = await DatabaseService.getDocumentById(docId);
      if (__DEV__) {
        console.log('[ChatScreen] Document lookup result:', document);
      }
      const isAct = document?.doc_type === 'act' || docId.startsWith('act-');
      if (__DEV__) {
        console.log('[ChatScreen] isAct:', isAct);
      }

      if (!document) {
        if (!isAct) {
          // Fallback: assume Constitution if no document found
          navigation.navigate('Reader', { doc_id: docId, chunk_id: chunkId });
          return;
        }
      }

      if (!isAct) {
        // Constitution: Navigate directly to article
        navigation.navigate('Reader', { doc_id: docId, chunk_id: chunkId });
      } else {
        // Act: Navigate directly to PDF
        const section = await DatabaseService.getSectionByChunkId(chunkId).catch(() => null);
        const initialPage = await DatabaseService.getActPageHint(
          docId,
          chunkId,
          section?.text
        );
        const pdfPath = document?.category && document?.pdf_filename
          ? `${document.category}/${document.pdf_filename}`
          : getActPdfPath(docId);
        const actTitle = document?.title || getActMetadataById(docId)?.title || 'Act';

        if (!pdfPath) {
          Alert.alert('PDF Unavailable', 'This Act does not have a PDF available yet.');
          return;
        }

        navigation.navigate('ActPdfViewer', {
          actTitle,
          pdfFilename: pdfPath,
          initialPage,
        });
      }
    } catch (error) {
      console.error('[ChatScreen] Error handling citation press:', error);
      // Fallback to Reader
      navigation.navigate('Reader', { doc_id: docId, chunk_id: chunkId });
    }
  }, [navigation]);

  const handleLinkPress = useCallback(
    (href?: string | null) => {
      if (__DEV__) {
        console.log('[ChatScreen] Link pressed - href:', href);
      }
      if (!href) return;
      if (href.startsWith('lawpal://open')) {
        const docIdMatch = href.match(/[?&]docId=([^&]+)/);
        const chunkIdMatch = href.match(/[?&]chunkId=([^&]+)/);

        const docId = docIdMatch ? decodeURIComponent(docIdMatch[1]) : null;
        const chunkId = chunkIdMatch ? decodeURIComponent(chunkIdMatch[1]) : null;

        if (__DEV__) {
          console.log('[ChatScreen] Parsed link - docId:', docId, 'chunkId:', chunkId);
        }

        if (docId && chunkId) {
          handleCitationPress(docId, chunkId);
          return;
        }
      }
      Linking.openURL(href).catch(() => {});
    },
    [handleCitationPress]
  );

  const renderersProps = useMemo(
    () => ({
      a: {
        onPress: (_event: unknown, href: string) => {
          handleLinkPress(href);
        },
      },
    }),
    [handleLinkPress]
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    const contentWidth = Math.min(width * 0.85, width);
    
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.botMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="scale" size={16} color="#FFF" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View
            style={[
              styles.bubble,
              isUser
                ? { backgroundColor: colors.primary }
                : { backgroundColor: isDarkMode ? '#333' : '#E5E5EA' },
            ]}
          >
            {isUser ? (
              <Text style={[styles.messageText, { color: '#FFF' }]}>{item.text}</Text>
            ) : (
              <RenderHTML
                contentWidth={contentWidth}
                source={{ html: marked.parse(item.text) }}
                baseStyle={htmlBaseStyle}
                tagsStyles={htmlTagsStyles}
                renderersProps={renderersProps}
              />
            )}
          </View>
          
          {!isUser && (
            <View style={styles.feedbackContainer}>
              <TouchableOpacity 
                onPress={() => handleFeedback(item.id, 1)}
                style={styles.feedbackButton}
              >
                <Ionicons 
                  name={item.rating === 1 ? "thumbs-up" : "thumbs-up-outline"} 
                  size={16} 
                  color={item.rating === 1 ? colors.primary : colors.textSecondary} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleFeedback(item.id, -1)}
                style={styles.feedbackButton}
              >
                <Ionicons 
                  name={item.rating === -1 ? "thumbs-down" : "thumbs-down-outline"} 
                  size={16} 
                  color={item.rating === -1 ? "#E74C3C" : colors.textSecondary} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleFeedback(item.id, 0)}
                style={styles.feedbackButton}
              >
                <Ionicons 
                  name={item.rating === 0 ? "flag" : "flag-outline"} 
                  size={16} 
                  color={item.rating === 0 ? "#F1C40F" : colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          )}

          {!isUser && item.suggestions && item.suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {item.suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionBubble,
                    { 
                      backgroundColor: isDarkMode ? '#222' : '#FFF',
                      borderColor: colors.primary,
                    }
                  ]}
                  onPress={() => handleSend(suggestion)}
                >
                  <Text style={[styles.suggestionText, { color: colors.primary }]}>{suggestion}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Legal Assistant</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Analyzing legal documents...</Text>
          </View>
        )}

        <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
                color: colors.text,
              },
            ]}
            placeholder="Ask a question..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            onFocus={() => {
              // Scroll to end when focusing input
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() && !isLoading ? colors.primary : colors.border },
            ]}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,  // Reduced padding since SafeAreaView handles bottom inset
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    minWidth: 100,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-end',
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    marginTop: 12,
    paddingLeft: 4,
  },
  suggestionBubble: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  feedbackContainer: {
    flexDirection: 'row',
    marginLeft: 40,
    marginTop: 4,
  },
  feedbackButton: {
    padding: 6,
    marginRight: 8,
  },
});

export default ChatScreen;
