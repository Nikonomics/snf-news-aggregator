import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, FileText, ExternalLink, Loader, AlertCircle, Zap, ChevronDown, ChevronUp, DollarSign, TrendingUp, Calendar, Award, Shield, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getMedicaidStates, askMedicaidQuestion, getRevenueLevers } from '../services/apiService';
import './MedicaidChatbot.css';

function MedicaidChatbot() {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState({});
  const [stateRevenueLevers, setStateRevenueLevers] = useState(null);
  const messagesEndRef = useRef(null);

  // Load states on mount
  useEffect(() => {
    loadStates();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadStates = async () => {
    try {
      const data = await getMedicaidStates();
      setStates(data.states);
    } catch (err) {
      console.error('Error loading states:', err);
      setError('Failed to load states. Please refresh the page.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStateChange = (e) => {
    const newState = e.target.value;
    setSelectedState(newState);
    setMessages([]);
    setError(null);

    // Add welcome message for the selected state
    if (newState) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I can help you with information about ${newState}'s Medicaid Fee-for-Service Nursing Facility Payment Policies. What would you like to know?`,
        citations: null
      }]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inputValue.trim() || !selectedState) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // Add user message to chat
    const newMessages = [
      ...messages,
      { role: 'user', content: userMessage }
    ];
    setMessages(newMessages);

    try {
      // Build conversation history for API (last 10 messages)
      const conversationHistory = newMessages
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Get AI response
      const response = await askMedicaidQuestion(
        selectedState,
        userMessage,
        conversationHistory,
        deepAnalysis
      );

      // Add assistant message to chat
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: response.response,
          citations: response.citations,
          deepAnalysis: response.deepAnalysis,
          documentsFetched: response.documentsFetched
        }
      ]);
    } catch (err) {
      console.error('Error getting response:', err);
      setError('Failed to get response. Please try again.');
      // Remove the user message since we couldn't get a response
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleQuestion = (question) => {
    if (!selectedState) {
      setError('Please select a state first');
      return;
    }
    setInputValue(question);
  };

  const toggleCitations = (messageIndex) => {
    setExpandedCitations(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  };

  // Group citations by category
  const groupCitationsByCategory = (citations) => {
    const grouped = {};
    citations.forEach(citation => {
      const category = citation.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(citation);
    });
    return grouped;
  };

  // Extract URLs from source text and make them clickable
  const renderSourceWithLinks = (sourceText) => {
    if (!sourceText) return null;

    // Match URLs in the text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = sourceText.split(urlRegex);

    return parts.map((part, idx) => {
      if (part.match(urlRegex)) {
        // Clean up URL (remove trailing punctuation)
        const cleanUrl = part.replace(/[.,;:)]$/, '');
        return (
          <a
            key={idx}
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="source-link"
          >
            {cleanUrl}
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const exampleQuestions = [
    "What add-on services can increase my reimbursement?",
    "Are there quality incentive payments available?",
    "When do rates get rebased in this state?",
    "What's the bed-hold policy?",
    "Are there payments for ventilator or behavioral health units?",
    "How can I maximize revenue through cost reporting?"
  ];

  return (
    <div className="medicaid-chatbot">
      <div className="chatbot-header">
        <div className="header-content">
          <MessageSquare size={28} />
          <div>
            <h1>Medicaid Policy Assistant</h1>
            <p>Ask questions about state-specific Medicaid nursing facility payment policies</p>
          </div>
        </div>
      </div>

      <div className="chatbot-container">
        {/* State Selector Sidebar */}
        <aside className="state-selector-sidebar">
          <div className="selector-header">
            <FileText size={20} />
            <h3>Select State</h3>
          </div>

          <select
            value={selectedState}
            onChange={handleStateChange}
            className="state-select"
          >
            <option value="">-- Choose a State --</option>
            {states.map(state => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          {selectedState && (
            <>
              <div className="deep-analysis-toggle">
                <label className="toggle-container">
                  <input
                    type="checkbox"
                    checked={deepAnalysis}
                    onChange={(e) => setDeepAnalysis(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <div className="toggle-label">
                    <Zap size={16} />
                    <span>Deep Analysis</span>
                  </div>
                </label>
                <p className="toggle-description">
                  {deepAnalysis
                    ? 'Fetching full regulatory documents for detailed answers'
                    : 'Using policy summaries for quick answers'}
                </p>
              </div>

              <div className="example-questions">
                <h4>Example Questions</h4>
                <div className="example-list">
                  {exampleQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      className="example-btn"
                      onClick={() => handleExampleQuestion(question)}
                      disabled={isLoading}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              <div className="info-box">
                <AlertCircle size={16} />
                <p>
                  All responses are based on the official Medicaid Fee-for-Service
                  Nursing Facility Payment Policies for {selectedState}.
                </p>
              </div>
            </>
          )}
        </aside>

        {/* Chat Area */}
        <div className="chat-main">
          {!selectedState ? (
            <div className="empty-state">
              <MessageSquare size={64} />
              <h2>Welcome to the Medicaid Policy Assistant</h2>
              <p>Select a state from the sidebar to start asking questions about their Medicaid nursing facility payment policies.</p>
            </div>
          ) : (
            <>
              <div className="messages-container">
                {messages.map((message, idx) => (
                  <div key={idx} className={`message ${message.role}`}>
                    <div className="message-content">
                      {message.deepAnalysis && message.role === 'assistant' && (
                        <div className="deep-analysis-badge">
                          <Zap size={14} />
                          <span>Deep Analysis {message.documentsFetched > 0 && `(${message.documentsFetched} docs)`}</span>
                        </div>
                      )}
                      <div className="message-text">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        ) : (
                          message.content
                        )}
                      </div>

                      {message.citations && message.citations.length > 0 && (
                        <div className="citations-container">
                          <div className="citations-divider">
                            <hr />
                            <span>Sources & References</span>
                            <hr />
                          </div>

                          <button
                            className="citations-toggle-btn"
                            onClick={() => toggleCitations(idx)}
                          >
                            {expandedCitations[idx] ? (
                              <>
                                <ChevronUp size={18} />
                                <span>Hide {message.citations.length} Sources</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={18} />
                                <span>Show {message.citations.length} Sources</span>
                              </>
                            )}
                          </button>

                          {expandedCitations[idx] && (
                            <div className="citations-content">
                              {Object.entries(groupCitationsByCategory(message.citations)).map(([category, citations]) => (
                                <div key={category} className="citation-category">
                                  <h4 className="citation-category-header">
                                    <FileText size={16} />
                                    {category}
                                  </h4>
                                  {citations.map((citation, cidx) => (
                                    <div key={cidx} className="citation-item">
                                      <div className="citation-policy-name">
                                        {citation.policyName}
                                      </div>
                                      {citation.sources && (
                                        <div className="citation-source">
                                          <ExternalLink size={14} />
                                          <div className="citation-source-text">
                                            {renderSourceWithLinks(citation.sources)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="message assistant loading">
                    <div className="message-content">
                      <Loader size={20} className="spinner" />
                      <span>Analyzing {selectedState} policies...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSubmit} className="chat-input-form">
                {error && (
                  <div className="error-banner">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="input-wrapper">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`Ask about ${selectedState}'s Medicaid policies...`}
                    disabled={isLoading}
                    className="chat-input"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="send-btn"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MedicaidChatbot;
