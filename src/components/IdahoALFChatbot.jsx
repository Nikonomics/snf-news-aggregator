import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Search, MessageCircle, BookOpen, ChevronRight, ExternalLink, FileText, Calendar, Tag, Filter, Grid, List, Star, Building, Users, Shield, Heart } from 'lucide-react';
import './IdahoALFChatbot.css';

const IdahoALFChatbot = () => {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'library'
  const [messages, setMessages] = useState([]);
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Regulation categories
  const categories = [
    { id: 'all', name: 'All Regulations', icon: BookOpen, color: 'bg-gray-100 text-gray-700' },
    { id: 'administrative', name: 'Administrative', icon: FileText, color: 'bg-blue-100 text-blue-700' },
    { id: 'licensing', name: 'Licensing', icon: Building, color: 'bg-green-100 text-green-700' },
    { id: 'staffing', name: 'Staffing', icon: Users, color: 'bg-purple-100 text-purple-700' },
    { id: 'physical_plant', name: 'Physical Plant', icon: Building, color: 'bg-orange-100 text-orange-700' },
    { id: 'fire_safety', name: 'Fire Safety', icon: Shield, color: 'bg-red-100 text-red-700' },
    { id: 'medications', name: 'Medications', icon: Heart, color: 'bg-pink-100 text-pink-700' },
    { id: 'resident_care', name: 'Resident Care', icon: Heart, color: 'bg-indigo-100 text-indigo-700' }
  ];

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.icon : FileText;
  };

  const getCategoryColor = (category) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.color : 'bg-gray-100 text-gray-700';
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedRegulation) {
      console.log('Selected regulation changed:', selectedRegulation);
    }
  }, [selectedRegulation]);

  // Show welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "👋 Hello! I'm your Idaho Assisted Living Facility regulation expert. Ask me anything about IDAPA 16.03.22 regulations.\n\n**Example questions:**\n- What are the staffing requirements for a 20-bed facility?\n- How much square footage is required per resident?\n- What are the bathroom requirements?\n- Do I need a sprinkler system?\n- Can staff assist with insulin?"
      }]);
    }
  }, []);

  // Load regulations on component mount
  useEffect(() => {
    loadRegulations();
  }, []);

  const loadRegulations = async () => {
    try {
      setIsLoadingRegulations(true);
      setRegulationsError(null);
      const response = await fetch('https://alf-chatbot.onrender.com/chunks');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRegulations(data.chunks || []);
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
      // Filter regulations locally based on search query
      const filtered = regulations.filter(regulation => 
        regulation.section_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        regulation.citation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        regulation.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
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

        // Add user message and remove welcome message if it's the first user message
        setMessages(prev => {
          const newMessages = [...prev];
          // If this is the first user message and we have a welcome message, remove it
          if (newMessages.length === 1 && newMessages[0].role === 'assistant' && newMessages[0].content.includes('👋 Hello!')) {
            newMessages.shift(); // Remove the welcome message
          }
          return [...newMessages, { role: 'user', content: userMessage }];
        });
    setIsLoading(true);

    try {
      // Call backend API
      const response = await fetch('https://alf-chatbot.onrender.com/query', {
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
      console.log('API Response:', data); // Debug log
      
      // Add assistant response
      setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
        citations: data.citations || []
      }]);

    } catch (error) {
      console.error('Error calling chatbot API:', error);
      setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ **Error:** Unable to connect to the chatbot backend. Please check if the backend service is running on Render.`,
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
    <div className="min-h-screen bg-gray-50 idaho-alf-container">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <Building className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900" style={{fontFamily: 'Inter, system-ui, sans-serif'}}>
              Idaho ALF RegNavigator - AI-powered assistant for Idaho Assisted Living Facility regulations
        </h1>
          </div>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="flex h-screen">
        {/* Left Side - Chat Interface */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200 relative">
          {/* Chat Header */}
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
                <p className="text-sm text-gray-600">Ask questions about Idaho ALF regulations</p>
              </div>
            </div>
      </div>

      {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
                  className={`max-w-2xl rounded-lg px-4 py-3 ${
                message.role === 'user'
                      ? 'bg-blue-500 text-white'
                  : message.error
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}
                >
                  {message.role === 'assistant' && !message.error && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-600">RegNavigator</span>
              </div>
                  )}
                  
                  <div className="prose prose-sm max-w-none" style={{fontSize: '16px', lineHeight: '1.5'}}>
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                        <FileText size={12} />
                        Sources
                      </p>
                      <div className="flex flex-wrap gap-1">
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
                                ? 'bg-blue-100 text-blue-800'
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
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">RegNavigator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm text-gray-600">Analyzing regulations...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

          {/* Input Area - Positioned in center of chat area */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white border border-gray-300 rounded-lg shadow-lg px-6 py-4 pointer-events-auto max-w-2xl w-full mx-6">
              <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Idaho ALF regulations..."
                  className="flex-1 healthcare-input"
            disabled={isLoading}
                  style={{fontSize: '16px'}}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
                  className="healthcare-button"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
            </div>
          </div>
        </div>

        {/* Right Side - Regulation Library */}
        <div className="w-2/5 flex flex-col bg-white">
          {/* Library Header */}
          <div className="bg-green-50 border-b border-green-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Regulation Library</h2>
                <p className="text-sm text-gray-600">Browse and search regulations</p>
              </div>
            </div>
          </div>

          {/* Search Bar - Moved to center of library */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search regulations..."
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </form>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSearchResults([]);
                    }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent size={12} />
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Regulations List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingRegulations ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
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
            ) : (
              <div className="space-y-2">
                {(searchResults.length > 0 ? searchResults : regulations)
                  .filter(reg => selectedCategory === 'all' || reg.category === selectedCategory)
                  .slice(0, 20)
                  .map((regulation, index) => {
                    const CategoryIcon = getCategoryIcon(regulation.category);
                    const categoryColor = getCategoryColor(regulation.category);
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          console.log('Selected regulation:', regulation);
                          setSelectedRegulation(regulation);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedRegulation?.chunk_id === regulation.chunk_id
                            ? 'bg-blue-50 border-blue-300 shadow-sm'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`p-1.5 rounded ${categoryColor}`}>
                            <CategoryIcon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-blue-600 mb-1">
                              {regulation.citation}
                            </div>
                            <div className="text-sm text-gray-700 line-clamp-2">
                              {regulation.section_title}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Regulation Detail Modal */}
      {selectedRegulation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            console.log('Clicked outside modal');
            setSelectedRegulation(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedRegulation.citation}</h3>
                <p className="text-gray-600">{selectedRegulation.section_title}</p>
                </div>
              <button
                onClick={() => {
                  console.log('Closing modal');
                  setSelectedRegulation(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <ExternalLink size={20} />
              </button>
                </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="prose max-w-none">
                <ReactMarkdown>{selectedRegulation.content}</ReactMarkdown>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
            <button
                onClick={() => {
                  console.log('Asking about regulation:', selectedRegulation.citation);
                  setSelectedRegulation(null);
                  setInput(`Tell me about ${selectedRegulation.citation}`);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <MessageCircle size={16} />
                Ask about this regulation
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdahoALFChatbot;