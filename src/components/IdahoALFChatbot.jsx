import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Search, MessageCircle, BookOpen, ChevronRight, ExternalLink, FileText, Calendar, Tag } from 'lucide-react';

const IdahoALFChatbot = () => {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'search'
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hello! I'm your Idaho Assisted Living Facility regulation expert. Ask me anything about IDAPA 16.03.22 regulations.\n\n**Example questions:**\n- What are the staffing requirements for a 20-bed facility?\n- How much square footage is required per resident?\n- What are the bathroom requirements?\n- Do I need a sprinkler system?\n- Can staff assist with insulin?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRegulation, setSelectedRegulation] = useState(null);
  const [isLoadingRegulations, setIsLoadingRegulations] = useState(true);
  const [regulationsError, setRegulationsError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load regulations on component mount
  useEffect(() => {
    loadRegulations();
  }, []);

  const loadRegulations = async () => {
    try {
      setIsLoadingRegulations(true);
      setRegulationsError(null);
      const response = await fetch('http://localhost:8000/chunks');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRegulations(data);
    } catch (error) {
      console.error('Error loading regulations:', error);
      setRegulationsError('Failed to load regulations. Please check if the backend server is running.');
      setRegulations([]);
    } finally {
      setIsLoadingRegulations(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const response = await fetch('http://localhost:8000/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery.trim(),
          top_k: 10
        })
      });
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching regulations:', error);
    } finally {
      setIsSearching(false);
    }
  };

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        citations: data.citations || []
      }]);

    } catch (error) {
      console.error('Error calling chatbot API:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Error:** Unable to connect to the chatbot backend. Please make sure the API server is running on http://localhost:8000\n\nTo start the server:\n\`\`\`bash\ncd /Users/nikolashulewsky/snf-news-aggregator/idaho-alf-chatbot/backend\npython3 main.py\n\`\`\``,
        error: true
      }]);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🏥 Idaho ALF RegNavigator
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              AI-powered assistant for Idaho Assisted Living Facility regulations (IDAPA 16.03.22)
            </p>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle size={16} />
              Chat Assistant
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'search'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen size={16} />
              Browse Regulations
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chat' ? (
          /* Chat Interface */
          <div className="flex flex-col w-full">
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
                    {message.role === 'assistant' && !message.error && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          🤖
                        </div>
                        <span className="text-sm font-medium text-gray-700">RegNavigator</span>
                      </div>
                    )}
                    
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-2">Sources:</p>
                        <div className="flex flex-wrap gap-2">
                          {message.citations.map((citation, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedCitations(prev => 
                                prev.includes(citation.chunk_id) 
                                  ? prev.filter(id => id !== citation.chunk_id)
                                  : [...prev, citation.chunk_id]
                              )}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                selectedCitations.includes(citation.chunk_id)
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {citation.citation}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        🤖
                      </div>
                      <span className="text-sm font-medium text-gray-700">RegNavigator</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: 0.2}}></div>
                      </div>
                      <span className="text-sm text-gray-600">Analyzing regulations...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length === 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 px-6 py-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about Idaho ALF regulations..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Regulation Search Interface */
          <div className="flex w-full">
            {/* Search Sidebar */}
            <div className="w-1/3 bg-white border-r border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search size={20} />
                Search Regulations
              </h3>
              
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search regulations..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSearching ? '...' : 'Search'}
                  </button>
                </div>
              </form>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Search Results:</h4>
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedRegulation(result)}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                      <div className="font-medium text-sm text-blue-600 mb-1">
                        {result.citation}
                      </div>
                      <div className="text-sm text-gray-700 line-clamp-2">
                        {result.content.substring(0, 100)}...
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* All Regulations */}
              {searchResults.length === 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">All Regulations:</h4>
                  {isLoadingRegulations ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Loading regulations...</p>
                      </div>
                    </div>
                  ) : regulationsError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 mb-2">{regulationsError}</p>
                      <button
                        onClick={loadRegulations}
                        className="text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : regulations.length > 0 ? (
                    regulations.slice(0, 20).map((regulation, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedRegulation(regulation)}
                        className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                      >
                        <div className="font-medium text-sm text-blue-600 mb-1">
                          {regulation.citation}
                        </div>
                        <div className="text-sm text-gray-700 line-clamp-2">
                          {regulation.section_title}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-600">No regulations available</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Regulation Detail */}
            <div className="flex-1 p-6 bg-gray-50">
              {selectedRegulation ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {selectedRegulation.citation}
                      </h2>
                      <h3 className="text-lg font-semibold text-gray-700 mb-3">
                        {selectedRegulation.section_title}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedRegulation(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Tag size={16} />
                      {selectedRegulation.category}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText size={16} />
                      {selectedRegulation.source_pdf_page} pages
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {selectedRegulation.effective_date}
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {selectedRegulation.content}
                    </ReactMarkdown>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setActiveTab('chat');
                        setInput(`Tell me about ${selectedRegulation.citation}`);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <MessageCircle size={16} />
                      Ask about this regulation
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a regulation to view details
                    </h3>
                    <p className="text-gray-600">
                      Choose from the search results or browse all regulations
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdahoALFChatbot;