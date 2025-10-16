import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const IdahoALFChatbot = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hello! I'm your Idaho Assisted Living Facility regulation expert. Ask me anything about IDAPA 16.03.22 regulations.\n\n**Example questions:**\n- What are the staffing requirements for a 20-bed facility?\n- How much square footage is required per resident?\n- What are the bathroom requirements?\n- Do I need a sprinkler system?\n- Can staff assist with insulin?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Call backend API
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          conversation_history: messages.slice(1), // Exclude initial greeting
          top_k: 5,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Add assistant response with citations
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          citations: data.citations,
          retrieved_chunks: data.retrieved_chunks
        }
      ]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error:** Unable to connect to the chatbot backend. Please make sure the API server is running on http://localhost:8000\n\nTo start the server:\n\`\`\`bash\ncd /Users/nikolashulewsky/snf-news-aggregator/idaho-alf-chatbot/backend\npython3 main.py\n\`\`\``,
          error: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "What are the staffing requirements?",
    "Square footage per resident?",
    "Bathroom requirements?",
    "Fire safety requirements?",
    "Medication administration rules?"
  ];

  const handleQuickQuestion = (question) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          🏥 Idaho ALF RegNavigator
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          AI-powered assistant for Idaho Assisted Living Facility regulations (IDAPA 16.03.22)
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.error
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {/* Message Content */}
              <div className={`prose prose-sm max-w-none ${
                message.role === 'user' ? 'prose-invert' : ''
              }`}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>

              {/* Citations */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-2">
                    📚 CITATIONS:
                  </div>
                  <div className="space-y-1">
                    {message.citations.map((citation, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-gray-700 hover:bg-gray-50 p-2 rounded cursor-pointer"
                        onClick={() => {
                          const chunk = message.retrieved_chunks?.[idx];
                          if (chunk) {
                            setSelectedCitations([chunk]);
                          }
                        }}
                      >
                        <span className="font-mono font-semibold text-blue-600">
                          {citation.citation}
                        </span>
                        {': '}
                        <span className="text-gray-600">
                          {citation.section_title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Searching regulations...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="px-6 py-3 bg-white border-t border-gray-200">
          <div className="text-xs font-semibold text-gray-600 mb-2">
            Quick Questions:
          </div>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickQuestion(question)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Idaho ALF regulations..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
        <div className="mt-2 text-xs text-gray-500">
          Powered by Claude Sonnet 4 • Accurate citations from IDAPA 16.03.22
        </div>
      </div>

      {/* Citation Detail Modal */}
      {selectedCitations.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCitations([])}
        >
          <div
            className="bg-white rounded-lg max-w-3xl max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedCitations.map((chunk, idx) => (
              <div key={idx}>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {chunk.citation}
                </h3>
                <h4 className="text-sm font-semibold text-gray-600 mb-4">
                  {chunk.section_title}
                </h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {chunk.content}
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Relevance: {(chunk.similarity * 100).toFixed(1)}%
                </div>
              </div>
            ))}
            <button
              onClick={() => setSelectedCitations([])}
              className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdahoALFChatbot;
