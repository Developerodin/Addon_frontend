"use client";

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `Hello! I'm your Replenishment AI Agent. I can help you with:

• Demand forecasting analysis
• Inventory optimization recommendations  
• Replenishment planning strategies
• Supply chain insights
• Performance analytics

What would you like to know about your replenishment operations?`,
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Predefined responses
  const predefinedResponses: { [key: string]: string } = {
    'hi': `Hello! I'm your Replenishment AI Agent. I'm here to help you optimize your inventory and supply chain operations. 

What can I help you with today?`,
    
    'hello': `Hi there! I'm your AI-powered replenishment assistant. I can help you with demand forecasting, inventory optimization, and supply chain management.

How can I assist you?`,
    
    'what can you do': `I'm your Replenishment AI Agent with several powerful capabilities:

🔮 **Demand Forecasting**
• Analyze historical sales data
• Predict future demand patterns
• Generate accurate forecasts for products

📊 **Inventory Optimization**
• Recommend optimal stock levels
• Identify overstock/understock items
• Suggest reorder points and quantities

🚚 **Replenishment Planning**
• Calculate replenishment schedules
• Optimize order quantities
• Reduce stockouts and excess inventory

📈 **Performance Analytics**
• Track forecast accuracy
• Monitor inventory turnover
• Analyze supply chain efficiency

💡 **Smart Insights**
• Identify trends and patterns
• Provide actionable recommendations
• Optimize your entire supply chain

What specific area would you like to explore?`,
    
    'help': `I'm here to help! Here are some things you can ask me:

**General Questions:**
• "What can you do?"
• "How does demand forecasting work?"
• "What is inventory optimization?"

**Specific Operations:**
• "Help me optimize inventory for Store A"
• "Generate a forecast for Product X"
• "Analyze my replenishment performance"

**Technical Support:**
• "How accurate are your forecasts?"
• "What data do you need?"
• "How often should I update forecasts?"

Just type your question and I'll guide you through the process!`,
    
    'forecast': `I can help you with demand forecasting! Here's what I can do:

📅 **Generate Forecasts**
• Create predictions for any product/store combination
• Analyze historical patterns and seasonality
• Provide confidence intervals and accuracy metrics

📊 **Forecast Types**
• Short-term (weekly/monthly) forecasts
• Long-term (quarterly/yearly) projections
• Seasonal demand predictions
• Trend-based forecasting

🔧 **How to Use**
1. Tell me which product and store you want to forecast
2. Specify the time period (e.g., "next 3 months")
3. I'll analyze your data and generate predictions
4. You can then use these forecasts for replenishment planning

Would you like me to generate a forecast for a specific product or store?`,
    
    'inventory': `I can help optimize your inventory! Here's what I offer:

📦 **Inventory Analysis**
• Current stock levels across all locations
• Identify overstock and understock situations
• Calculate optimal inventory levels

🎯 **Optimization Strategies**
• Safety stock recommendations
• Reorder point calculations
• Economic order quantity (EOQ) analysis
• ABC analysis for inventory classification

📈 **Performance Metrics**
• Inventory turnover rates
• Days of inventory on hand
• Stockout frequency analysis
• Carrying cost optimization

💡 **Smart Recommendations**
• Automated reorder suggestions
• Seasonal inventory adjustments
• Cross-location inventory transfers

What specific inventory challenge would you like me to help with?`,
    
    'replenishment': `I can optimize your replenishment strategy! Here's how:

🔄 **Replenishment Planning**
• Calculate optimal reorder quantities
• Determine reorder timing and frequency
• Optimize order cycles and lead times

📊 **Strategy Optimization**
• Just-in-time (JIT) replenishment
• Economic order quantity (EOQ) calculations
• Safety stock optimization
• Multi-echelon inventory management

🚚 **Order Management**
• Automated reorder suggestions
• Batch order optimization
• Supplier performance tracking
• Lead time variability management

📈 **Performance Monitoring**
• Replenishment cycle time analysis
• Stockout prevention metrics
• Cost optimization tracking

Would you like me to analyze your current replenishment strategy or help optimize specific processes?`
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    console.log('Initializing speech recognition...');
    
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      console.log('webkitSpeechRecognition is available');
      
      try {
        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        // Configure speech recognition
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;
        
        console.log('Speech recognition instance created:', recognitionRef.current);

        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started');
        };

        recognitionRef.current.onresult = (event: any) => {
          console.log('Speech recognition result:', event);
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            setInputValue(prev => prev + finalTranscript);
          } else if (interimTranscript) {
            setInputValue(prev => prev + interimTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error, event);
          
          // Handle specific error types
          switch (event.error) {
            case 'network':
              console.log('Network error detected - this is common on macOS. Attempting automatic recovery...');
              
              // On macOS, network errors often resolve with a retry
              const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
              if (isMac) {
                // Try automatic recovery for macOS using enhanced retry
                console.log('Using enhanced retry mechanism for macOS network error');
                retryWithDelay();
              } else {
                const retry = confirm('Network error detected. This usually means the speech service needs to be restarted. Click OK to retry.');
                if (retry) {
                  restartSpeechRecognition();
                }
              }
              break;
            case 'not-allowed':
              const enableMic = confirm('Microphone access denied. Please allow microphone access in your browser settings and click OK to try again.');
              if (enableMic) {
                restartSpeechRecognition();
              }
              break;
            case 'no-speech':
              alert('No speech detected. Please try speaking again.');
              break;
            case 'audio-capture':
              alert('Audio capture error. Please check your microphone connection.');
              break;
            default:
              alert(`Speech recognition error: ${event.error}. Please try again.`);
          }
          
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
        };

        console.log('Speech recognition initialized successfully');
        
      } catch (error) {
        console.error('Error creating speech recognition instance:', error);
        alert('Failed to initialize speech recognition. Please refresh the page and try again.');
      }
    } else {
      console.error('webkitSpeechRecognition not available');
      console.log('Available speech recognition APIs:', {
        'webkitSpeechRecognition': 'webkitSpeechRecognition' in window,
        'SpeechRecognition': 'SpeechRecognition' in window,
        'mozSpeechRecognition': 'mozSpeechRecognition' in window,
        'msSpeechRecognition': 'msSpeechRecognition' in window
      });
    }
  };

  // Restart speech recognition
  const restartSpeechRecognition = () => {
    console.log('Restarting speech recognition...');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Speech recognition already stopped');
      }
    }
    
    // Clear the reference
    recognitionRef.current = null;
    
    // Wait a bit then reinitialize
    setTimeout(() => {
      console.log('Reinitializing speech recognition...');
      initializeSpeechRecognition();
    }, 1000); // Increased delay for macOS
  };

  // Enhanced retry mechanism for macOS network errors
  const retryWithDelay = (attempts = 0, maxAttempts = 3) => {
    if (attempts >= maxAttempts) {
      console.log('Max retry attempts reached');
      setIsRecovering(false);
      alert('Unable to start speech recognition after multiple attempts. Please refresh the page and try again.');
      return;
    }
    
    console.log(`Retry attempt ${attempts + 1}/${maxAttempts}`);
    setIsRecovering(true);
    
    setTimeout(() => {
      try {
        if (recognitionRef.current && !isListening) {
          recognitionRef.current.start();
          setIsListening(true);
          setIsRecovering(false);
          console.log('Retry successful');
        } else {
          console.log('Recognition not available, retrying...');
          retryWithDelay(attempts + 1, maxAttempts);
        }
      } catch (error) {
        console.log('Retry failed:', error);
        retryWithDelay(attempts + 1, maxAttempts);
      }
    }, 1000 * (attempts + 1)); // Exponential backoff
  };

  // Initialize speech recognition on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      setIsSpeechSupported(true);
      initializeSpeechRecognition();
    } else {
      console.warn('Speech recognition not supported in this browser');
      setIsSpeechSupported(false);
    }
  }, []);

  // Check microphone permissions
  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      console.log('Checking microphone permissions...');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported');
        alert('Your browser does not support microphone access. Please use Chrome or Safari.');
        return false;
      }
      
      // Check if we're on macOS and provide specific guidance
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if (isMac) {
        console.log('Detected macOS - checking microphone access...');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('Microphone access granted!', stream.getTracks());
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      return true;
      
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      
      if (error.name === 'NotAllowedError') {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        let message = 'Microphone access is required. ';
        
        if (isMac) {
          message += 'On macOS, please:\n1. Check System Preferences > Security & Privacy > Microphone\n2. Make sure your browser is allowed\n3. Refresh the page and try again';
        } else {
          message += 'Please allow microphone access in your browser settings.';
        }
        
        const retry = confirm(message + '\n\nClick OK to try again after enabling permissions.');
        if (retry) {
          return await checkMicrophonePermission(); // Retry once
        }
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        alert('Microphone is in use by another application. Please close other apps using the microphone and try again.');
      }
      
      return false;
    }
  };

  // Test microphone function
  const testMicrophone = async () => {
    console.log('Testing microphone...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone test successful:', stream);
      
      // Show success message
      alert('Microphone test successful! Your microphone is working correctly.');
      
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('Microphone test failed:', error);
      alert(`Microphone test failed: ${error.message}`);
      return false;
    }
  };

  // Handle voice input
  const handleVoiceInput = async () => {
    console.log('Voice input requested, current state:', { 
      hasRecognition: !!recognitionRef.current, 
      isListening, 
      isSpeechSupported 
    });
    
    if (!recognitionRef.current) {
      console.log('No speech recognition instance, reinitializing...');
      // Try to reinitialize if not available
      initializeSpeechRecognition();
      if (!recognitionRef.current) {
        alert('Speech recognition is not supported in this browser. Please use Chrome or Safari.');
        return;
      }
    }
    
    if (isListening) {
      // Stop listening
      console.log('Stopping speech recognition...');
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.log('Speech recognition already stopped');
        setIsListening(false);
      }
    } else {
      // Check microphone permission first
      console.log('Checking microphone permissions...');
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        console.log('Microphone permission denied or cancelled');
        return; // User cancelled or permission denied
      }
      
      // Start listening - clear input and start fresh
      console.log('Starting speech recognition...');
      setInputValue('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Speech recognition started successfully');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        
        // Try to restart if there's an error
        const retry = confirm('Failed to start voice recognition. Click OK to restart the speech service and try again.');
        if (retry) {
          restartSpeechRecognition();
        }
        
        setIsListening(false);
      }
    }
  };

  // Generate AI response
  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check for predefined responses
    for (const [key, response] of Object.entries(predefinedResponses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }

    // Default response for unknown queries
    return `I understand you're asking about "${userMessage}". While I'm still learning about this specific topic, I can help you with:

• Demand forecasting and analysis
• Inventory optimization strategies
• Replenishment planning
• Supply chain performance metrics

Could you rephrase your question or ask about one of these areas? I'm here to help optimize your replenishment operations!`;
  };

  // Handle message send
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse = generateResponse(userMessage.content);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000);
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle keyboard shortcuts for voice input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Shift+M for voice input (only if speech is supported)
    if (isSpeechSupported && e.ctrlKey && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      handleVoiceInput();
    }
  };

  return (
    <div className="h-[calc(100vh-300px)] flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex items-start space-x-3 ${
            message.type === 'user' ? 'justify-end' : ''
          }`}>
            {message.type === 'ai' && (
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-robot-line text-white text-sm"></i>
              </div>
            )}
            
            <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${
              message.type === 'user' 
                ? 'bg-gradient-to-r from-primary to-primary/80 text-white rounded-tr-md' 
                : 'bg-gray-100 text-gray-800 rounded-tl-md'
            }`}>
              <p className="whitespace-pre-line">{message.content}</p>
              <div className={`text-xs mt-2 ${
                message.type === 'user' ? 'text-white/70' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            
            {message.type === 'user' && (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="ri-user-line text-gray-600 text-sm"></i>
              </div>
            )}
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="ri-robot-line text-white text-sm"></i>
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="mt-auto border-t border-gray-200 bg-white/80 backdrop-blur-sm p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
                            <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onKeyDown={handleKeyDown}
                  placeholder={isSpeechSupported ? "Ask your AI agent anything... (Ctrl+Shift+M for voice)" : "Ask your AI agent anything..."}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white/90 ${
                    isSpeechSupported ? 'pr-24' : 'pr-12'
                  }`}
                />
            
            {/* Voice Input Button - Only show if speech recognition is supported */}
            {isSpeechSupported && (
              <button
                onClick={handleVoiceInput}
                className={`absolute right-16 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={isListening ? 'Click to stop listening' : 'Click to start voice input'}
              >
                <i className={`ri-${isListening ? 'stop-line' : 'mic-line'} text-sm`}></i>
              </button>
            )}
            
            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center text-white hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-send-plane-fill text-sm"></i>
            </button>
          </div>
        </div>
                    <div className="mt-3 text-xs text-gray-500 text-center">
              {isListening ? (
                <div className="flex items-center justify-center space-x-2 text-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span>Listening... Speak now</span>
                </div>
              ) : isRecovering ? (
                <div className="flex items-center justify-center space-x-2 text-blue-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Recovering from network error... Please wait</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <span>AI Agent is powered by advanced machine learning models for accurate replenishment insights</span>
                  {isSpeechSupported && (
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        onClick={testMicrophone}
                        className="text-blue-600 hover:text-blue-800 underline text-xs"
                        title="Test microphone access"
                      >
                        Test Microphone
                      </button>
                      <button
                        onClick={restartSpeechRecognition}
                        className="text-primary hover:text-primary/80 underline text-xs"
                        title="Restart speech recognition service"
                      >
                        Having voice issues? Click here to restart
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
      </div>
    </div>
  );
};

export default AgentChat;
