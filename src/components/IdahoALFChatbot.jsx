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
  const [expandedRegulations, setExpandedRegulations] = useState(new Set());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Group regulations by parent regulation
  const groupRegulationsByParent = (regs) => {
    const grouped = {};
    regs.forEach(reg => {
      // Group all US Food Code entries under one parent
      if (reg.citation.includes('US Food Code')) {
        const parent = 'US Food Code';
        if (!grouped[parent]) {
          grouped[parent] = [];
        }
        grouped[parent].push(reg);
        return;
      }
      
      // Extract parent regulation by first two digits (e.g., "IDAPA 16.02" from "IDAPA 16.02.01" or "IDAPA 16.02.19")
      const match = reg.citation.match(/^([A-Z0-9\s]+\d+\.\d+)/);
      const parent = match ? match[1] : reg.citation;
      
      if (!grouped[parent]) {
        grouped[parent] = [];
      }
      grouped[parent].push(reg);
    });
    
    // Sort sections within each parent
    Object.keys(grouped).forEach(parent => {
      grouped[parent].sort((a, b) => {
        // Sort by the full citation numerically
        const aParts = a.citation.match(/(\d+)/g) || [];
        const bParts = b.citation.match(/(\d+)/g) || [];
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aNum = parseInt(aParts[i]) || 0;
          const bNum = parseInt(bParts[i]) || 0;
          if (aNum !== bNum) {
            return aNum - bNum;
          }
        }
        return 0;
      });
    });
    
    return grouped;
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
    // Handle selected regulation changes
  }, [selectedRegulation]);

  // Show welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "# RegNavigator\n\n👋 Hello! I'm your Idaho Assisted Living Facility regulation expert. Ask me anything about IDAPA 16.03.22 regulations.\n\n**Example questions:**\n- What are the staffing requirements for a 20-bed facility?\n- How much square footage is required per resident?\n- What are the bathroom requirements?\n- Do I need a sprinkler system?\n- Can staff assist with insulin?"
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
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Filter regulations locally based on search query
      const filtered = regulations.filter(regulation => 
        regulation.section_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        regulation.citation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        regulation.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        regulation.content.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="w-4/5 flex flex-col bg-white border-r border-gray-200 relative">

          {/* Input Area - Right below RegNavigator */}
          <div className="px-6 py-4 bg-white border-b border-gray-200">
            <form onSubmit={handleSubmit} className="w-full mx-auto">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about Idaho regulations..."
                  className="w-[20%] px-4 py-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-6 py-8 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>

          {/* Messages Area - Cleaner */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-white">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
                  className={`max-w-3xl rounded-xl px-5 py-4 ${
                message.role === 'user'
                      ? 'bg-blue-500 text-white ml-8'
                  : message.error
                      ? 'bg-red-50 border border-red-200 text-red-800 mr-8'
                      : 'bg-gray-50 border border-gray-200 mr-8'
                  }`}
                >
                  {message.role === 'assistant' && !message.error && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Building className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">RegNavigator</span>
                    </div>
                  )}
                  
                  <div className="prose prose-sm max-w-none" style={{fontSize: '16px', lineHeight: '1.5'}}>
                    <ReactMarkdown
                      components={{
                        // Custom rendering for inline citations like [1], [2], etc.
                        text: ({node, ...props}) => {
                          const text = props.children;
                          // Check if the text contains citation patterns like [1], [2], etc.
                          if (typeof text === 'string' && /\[\d+\]/.test(text)) {
                            const parts = text.split(/(\[\d+\])/g);
                            return (
                              <>
                                {parts.map((part, idx) => {
                                  const citationMatch = part.match(/\[(\d+)\]/);
                                  if (citationMatch) {
                                    const citationIndex = parseInt(citationMatch[1]) - 1;
                                    const citation = message.citations?.[citationIndex];
                                    const fullRegulation = regulations.find(
                                      reg => reg.citation === citation?.citation || reg.chunk_id === citation?.chunk_id
                                    );
                                    
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          if (fullRegulation) {
                                            setSelectedRegulation(fullRegulation);
                                          }
                                        }}
                                        className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium transition-colors ${
                                          fullRegulation ? 'cursor-pointer' : 'cursor-default'
                                        }`}
                                        title={fullRegulation ? `Click to view ${citation?.citation}` : 'Regulation not available'}
                                      >
                                        {part}
                                      </button>
                                    );
                                  }
                                  return <span key={idx}>{part}</span>;
                                })}
                              </>
                            );
                          }
                          return <span {...props} />;
                        }
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-2">Sources</p>
                      <div className="flex flex-wrap gap-1">
                        {message.citations.map((citation, idx) => {
                          // Find the full regulation in the regulations list
                          const fullRegulation = regulations.find(
                            reg => reg.citation === citation.citation || reg.chunk_id === citation.chunk_id
                          );
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                if (fullRegulation) {
                                  setSelectedRegulation(fullRegulation);
                                }
                              }}
                              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                fullRegulation 
                                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer' 
                                  : 'bg-gray-100 text-gray-600 cursor-default'
                              }`}
                              title={fullRegulation ? 'Click to view full regulation' : 'Regulation not available'}
                            >
                              [{idx + 1}] {citation.citation}
                            </button>
                          );
                        })}
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
        </div>

        {/* Right Side - Regulation Library */}
        <div className="w-1/5 flex flex-col bg-white border-l border-gray-200">
          {/* Library Header - Cleaner */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Regulation Library</h2>
                <p className="text-sm text-gray-500">Browse and search regulations</p>
              </div>
            </div>
          </div>

          {/* Search Bar - Simplified */}
          <div className="p-4 border-b border-gray-200">
            <form onSubmit={handleSearch} className="mb-4">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search regulations..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>

            {/* Category Filter - Simplified */}
            <div className="flex flex-wrap gap-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSearchResults([]);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
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
              <div className="space-y-1">
                {(() => {
                  const regsToDisplay = searchResults.length > 0 ? searchResults : regulations;
                  const filteredRegs = regsToDisplay.filter(reg => selectedCategory === 'all' || reg.category === selectedCategory);
                  const groupedRegs = groupRegulationsByParent(filteredRegs);
                  const parentKeys = Object.keys(groupedRegs).sort();
                  
                  return parentKeys.map((parent, idx) => {
                    const sections = groupedRegs[parent];
                    const isExpanded = expandedRegulations.has(parent);
                    
                    return (
                      <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedRegulations);
                            if (isExpanded) {
                              newExpanded.delete(parent);
                            } else {
                              newExpanded.add(parent);
                            }
                            setExpandedRegulations(newExpanded);
                          }}
                          className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium text-xs text-gray-900">{parent}</span>
                          <ChevronRight 
                            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                        
                        {isExpanded && (
                          <div className="bg-white">
                            {(() => {
                              // Check if we should show all sections or just first 10
                              const showAllKey = `showAll_${parent}`;
                              const showAll = expandedRegulations.has(showAllKey);
                              const displaySections = showAll ? sections : sections.slice(0, 10);
                              
                              return (
                                <>
                                  {displaySections.map((regulation, sectionIdx) => (
                                    <button
                                      key={sectionIdx}
                                      onClick={() => {
                                        setSelectedRegulation(regulation);
                                      }}
                                      className={`w-full text-left p-2 pl-4 border-t border-gray-100 transition-colors ${
                                        selectedRegulation?.chunk_id === regulation.chunk_id
                                          ? 'bg-blue-50 border-blue-300'
                                          : 'hover:bg-gray-50'
                                      }`}
                                    >
                                      <div className="font-medium text-xs text-gray-700 mb-0.5">
                                        {regulation.citation.replace(parent + '.', '')}
                                      </div>
                                      <div className="text-xs text-gray-500 line-clamp-1">
                                        {regulation.section_title}
                                      </div>
                                    </button>
                                  ))}
                                  {sections.length > 10 && (
                                    <button
                                      onClick={() => {
                                        const newExpanded = new Set(expandedRegulations);
                                        if (showAll) {
                                          newExpanded.delete(showAllKey);
                                        } else {
                                          newExpanded.add(showAllKey);
                                        }
                                        setExpandedRegulations(newExpanded);
                                      }}
                                      className="w-full text-left text-xs text-blue-600 hover:text-blue-800 p-2 pl-4 border-t border-gray-100 hover:bg-blue-50 transition-colors"
                                    >
                                      {showAll ? 'Show less' : `+${sections.length - 10} more sections`}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Regulation Detail Modal */}
      {selectedRegulation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8"
          onClick={() => {
            setSelectedRegulation(null);
          }}
          style={{ 
            zIndex: 9999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            className="bg-white rounded-lg shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              position: 'relative',
              zIndex: 10000,
              maxWidth: '50vw',
              maxHeight: '80vh',
              minWidth: '600px',
              minHeight: '500px',
              width: 'auto',
              height: 'auto',
              padding: '32px',
              boxSizing: 'border-box'
            }}
          >
            <div className="flex items-center justify-between pb-6 border-b border-gray-200">
              <div className="pr-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedRegulation.citation}</h3>
                <p className="text-sm text-gray-700 mt-2">{selectedRegulation.section_title}</p>
                </div>
              <button
                onClick={() => {
                  setSelectedRegulation(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-2 flex-shrink-0 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ExternalLink size={24} />
              </button>
                </div>
            
            <div className="overflow-y-auto flex-1 py-6">
              <ReactMarkdown>{selectedRegulation.content}</ReactMarkdown>
            </div>
            
            <div className="pt-6 border-t border-gray-200 bg-gray-50 -mx-8 -mb-8 px-8 py-6">
            <button
                onClick={async () => {
                  const question = `What are the requirements for ${selectedRegulation.citation} - ${selectedRegulation.section_title}?`;
                  setSelectedRegulation(null);
                  setInput(question);
                  
                  // Automatically submit the query
                  setIsLoading(true);
                  try {
                    const response = await fetch('https://alf-chatbot.onrender.com/query', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        question: question,
                        conversation_history: messages,
                        top_k: 5,
                        temperature: 0.3
                      }),
                    });

                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    // Add user message
                    const userMessage = {
                      role: 'user',
                      content: question,
                      timestamp: new Date().toISOString()
                    };
                    
                    // Add assistant response
                    const assistantMessage = {
                      role: 'assistant',
                      content: data.response,
                      citations: data.citations,
                      retrieved_chunks: data.retrieved_chunks,
                      usage: data.usage,
                      timestamp: new Date().toISOString()
                    };
                    
                    setMessages(prev => [...prev, userMessage, assistantMessage]);
                    setInput('');
                  } catch (error) {
                    console.error('Error querying chatbot:', error);
                    const userMessage = {
                      role: 'user',
                      content: question,
                      timestamp: new Date().toISOString()
                    };
                    const errorMessage = {
                      role: 'assistant',
                      content: 'Sorry, I encountered an error while processing your question. Please try again.',
                      timestamp: new Date().toISOString()
                    };
                    setMessages(prev => [...prev, userMessage, errorMessage]);
                  } finally {
                    setIsLoading(false);
                  }
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