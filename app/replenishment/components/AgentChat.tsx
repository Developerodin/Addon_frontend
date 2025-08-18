"use client";

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Dark mode effect when Agent tab is active
  useEffect(() => {
    // Store current theme
    const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    
    // Add smooth transition for theme change
    document.documentElement.style.transition = 'all 0.3s ease-in-out';
    
    // Apply dark mode for Agent tab
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    document.documentElement.classList.add('dark-mode-active');
    document.body.classList.add('dark-mode-active');
    
    // Force dark mode on all parent containers
    let parent = document.body.parentElement;
    while (parent) {
      parent.classList.add('dark-mode-active');
      parent = parent.parentElement;
    }
    
    // Store original theme for restoration
    (window as any).__originalTheme = currentTheme;
    
    // Add custom dark mode styles
    const style = document.createElement('style');
    style.id = 'agent-dark-mode-styles';
    style.textContent = `
      /* Global dark mode */
      .dark-mode-active {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
        color: #e2e8f0 !important;
      }
      
      /* Header and navigation dark mode */
      .dark-mode-active header,
      .dark-mode-active .header,
      .dark-mode-active .main-header,
      .dark-mode-active .top-header {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
      }
      
      .dark-mode-active .header *,
      .dark-mode-active .main-header *,
      .dark-mode-active .top-header * {
        color: #f1f5f9 !important;
      }
      
      /* Sidebar dark mode */
      .dark-mode-active .sidebar,
      .dark-mode-active .main-sidebar,
      .dark-mode-active .left-sidebar {
        background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%) !important;
        border-right: 1px solid rgba(148, 163, 184, 0.2) !important;
      }
      
      .dark-mode-active .sidebar *,
      .dark-mode-active .main-sidebar *,
      .dark-mode-active .left-sidebar * {
        color: #e2e8f0 !important;
      }
      
      /* Main content area */
      .dark-mode-active .main-content,
      .dark-mode-active .content-area,
      .dark-mode-active .dashboard-content {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
      }
      
      /* Boxes and cards */
      .dark-mode-active .box {
        background: rgba(30, 41, 59, 0.9) !important;
        border-color: rgba(148, 163, 184, 0.2) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
      }
      
      .dark-mode-active .box-title,
      .dark-mode-active .card-title,
      .dark-mode-active h1, .dark-mode-active h2, 
      .dark-mode-active h3, .dark-mode-active h4,
      .dark-mode-active h5, .dark-mode-active h6 {
        color: #f1f5f9 !important;
      }
      
      /* Text colors */
      .dark-mode-active .text-gray-500,
      .dark-mode-active .text-gray-600,
      .dark-mode-active .text-gray-700 {
        color: #94a3b8 !important;
      }
      
      .dark-mode-active .text-gray-800,
      .dark-mode-active .text-gray-900 {
        color: #e2e8f0 !important;
      }
      
      /* Backgrounds */
      .dark-mode-active .bg-gray-100\/50,
      .dark-mode-active .bg-gray-100,
      .dark-mode-active .bg-gray-50 {
        background: rgba(51, 65, 85, 0.5) !important;
      }
      
      .dark-mode-active .bg-white {
        background: rgba(30, 41, 59, 0.8) !important;
      }
      
      /* Hover effects */
      .dark-mode-active .hover\\:bg-white\\/60:hover,
      .dark-mode-active .hover\\:bg-gray-50:hover {
        background: rgba(148, 163, 184, 0.2) !important;
      }
      
      /* Tables */
      .dark-mode-active table {
        background: rgba(30, 41, 59, 0.9) !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        border: 1px solid rgba(148, 163, 184, 0.2) !important;
      }
      
      .dark-mode-active th {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        color: #f1f5f9 !important;
        border-color: rgba(148, 163, 184, 0.3) !important;
        padding: 16px 20px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        font-size: 13px !important;
        border-bottom: 2px solid rgba(148, 163, 184, 0.3) !important;
      }
      
      .dark-mode-active td {
        border-color: rgba(148, 163, 184, 0.15) !important;
        color: #e2e8f0 !important;
        padding: 16px 20px !important;
        font-size: 14px !important;
        border-bottom: 1px solid rgba(148, 163, 184, 0.1) !important;
        transition: all 0.2s ease !important;
      }
      
      .dark-mode-active tr {
        transition: all 0.2s ease !important;
      }
      
      .dark-mode-active tr:hover {
        background: rgba(148, 163, 184, 0.08) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
      }
      
      .dark-mode-active tr:nth-child(even) {
        background: rgba(51, 65, 85, 0.3) !important;
      }
      
      .dark-mode-active tr:nth-child(even):hover {
        background: rgba(148, 163, 184, 0.12) !important;
      }
      
      /* Table container */
      .dark-mode-active .table-container,
      .dark-mode-active .data-table {
        background: rgba(30, 41, 59, 0.8) !important;
        border-radius: 16px !important;
        padding: 24px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        border: 1px solid rgba(148, 163, 184, 0.2) !important;
      }
      
      /* Form elements */
      .dark-mode-active input,
      .dark-mode-active select,
      .dark-mode-active textarea {
        background: rgba(30, 41, 59, 0.9) !important;
        border: 2px solid rgba(148, 163, 184, 0.3) !important;
        color: #f1f5f9 !important;
        border-radius: 8px !important;
        padding: 12px 16px !important;
        font-size: 14px !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
      }
      
      .dark-mode-active input:focus,
      .dark-mode-active select:focus,
      .dark-mode-active textarea:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
        background: rgba(30, 41, 59, 1) !important;
        transform: translateY(-1px) !important;
      }
      
      .dark-mode-active input::placeholder,
      .dark-mode-active textarea::placeholder {
        color: #94a3b8 !important;
        opacity: 0.8 !important;
      }
      
      /* Chat input specific styling */
      .dark-mode-active .chat-input,
      .dark-mode-active .message-input {
        background: rgba(51, 65, 85, 0.9) !important;
        border: 2px solid rgba(148, 163, 184, 0.4) !important;
        color: #f1f5f9 !important;
        border-radius: 25px !important;
        padding: 16px 20px !important;
        font-size: 16px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      }
      
      .dark-mode-active .chat-input:focus,
      .dark-mode-active .message-input:focus {
        border-color: #10b981 !important;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2) !important;
        background: rgba(51, 65, 85, 1) !important;
      }
      
      /* Buttons */
      .dark-mode-active .ti-btn,
      .dark-mode-active button,
      .dark-mode-active .btn {
        background: rgba(51, 65, 85, 0.9) !important;
        border-color: rgba(148, 163, 184, 0.4) !important;
        color: #f1f5f9 !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
      }
      
      .dark-mode-active .ti-btn:hover,
      .dark-mode-active button:hover,
      .dark-mode-active .btn:hover {
        background: rgba(71, 85, 105, 1) !important;
        border-color: rgba(148, 163, 184, 0.6) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
      }
      
      /* Primary buttons */
      .dark-mode-active .ti-btn-primary,
      .dark-mode-active .btn-primary {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
        border-color: #3b82f6 !important;
        color: #ffffff !important;
      }
      
      .dark-mode-active .ti-btn-primary:hover,
      .dark-mode-active .btn-primary:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important;
        border-color: #2563eb !important;
      }
      
      /* Send button specific styling */
      .dark-mode-active .send-button,
      .dark-mode-active .voice-button {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
        border-color: #10b981 !important;
        color: #ffffff !important;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3) !important;
      }
      
      .dark-mode-active .send-button:hover,
      .dark-mode-active .voice-button:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
        border-color: #059669 !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4) !important;
      }
      
      /* Charts and graphs */
      .dark-mode-active .chart-container,
      .dark-mode-active .apexcharts-canvas {
        background: rgba(30, 41, 59, 0.8) !important;
      }
      
      /* Status indicators */
      .dark-mode-active .status-indicator,
      .dark-mode-active .health-status {
        background: rgba(51, 65, 85, 0.8) !important;
        border-color: rgba(148, 163, 184, 0.3) !important;
      }
      
      /* Scrollbars */
      .dark-mode-active ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      .dark-mode-active ::-webkit-scrollbar-track {
        background: rgba(30, 41, 59, 0.8) !important;
      }
      
      .dark-mode-active ::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.5) !important;
        border-radius: 4px;
      }
      
      .dark-mode-active ::-webkit-scrollbar-thumb:hover {
        background: rgba(148, 163, 184, 0.7) !important;
      }
      
      /* Override any remaining white backgrounds */
      .dark-mode-active *[style*="background: white"],
      .dark-mode-active *[style*="background: #fff"],
      .dark-mode-active *[style*="background-color: white"],
      .dark-mode-active *[style*="background-color: #fff"] {
        background: rgba(30, 41, 59, 0.8) !important;
      }
      
      /* Additional header targeting for different layouts */
      .dark-mode-active .navbar,
      .dark-mode-active .nav-header,
      .dark-mode-active .app-header,
      .dark-mode-active .top-navbar,
      .dark-mode-active .main-navbar {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2) !important;
      }
      
      .dark-mode-active .navbar-brand,
      .dark-mode-active .logo,
      .dark-mode-active .brand-logo {
        color: #f1f5f9 !important;
      }
      
      .dark-mode-active .nav-link,
      .dark-mode-active .nav-item,
      .dark-mode-active .navbar-nav a {
        color: #e2e8f0 !important;
      }
      
      .dark-mode-active .nav-link:hover,
      .dark-mode-active .nav-item:hover,
      .dark-mode-active .navbar-nav a:hover {
        color: #f1f5f9 !important;
        background: rgba(148, 163, 184, 0.1) !important;
      }
      
      /* Force dark mode on body and html */
      .dark-mode-active body,
      .dark-mode-active html {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
        color: #e2e8f0 !important;
      }
      
      /* Target any element with white background */
      .dark-mode-active [class*="bg-white"],
      .dark-mode-active [class*="bg-light"],
      .dark-mode-active [class*="bg-gray-50"] {
        background: rgba(30, 41, 59, 0.8) !important;
      }
      
      /* Chat messages styling - Only target actual message content divs */
      .dark-mode-active .message,
      .dark-mode-active .chat-message,
      .dark-mode-active div[class*="message"],
      .dark-mode-active div[class*="chat"] {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        border: 1px solid rgba(148, 163, 184, 0.3) !important;
        border-radius: 16px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        transition: all 0.3s ease !important;
        color: #f1f5f9 !important;
      }
      
      .dark-mode-active .message:hover,
      .dark-mode-active .chat-message:hover,
      .dark-mode-active div[class*="message"]:hover,
      .dark-mode-active div[class*="chat"]:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
        background: linear-gradient(135deg, #334155 0%, #475569 100%) !important;
      }
      
      /* AI message specific styling */
      .dark-mode-active .message.ai,
      .dark-mode-active .chat-message.ai,
      .dark-mode-active div[class*="ai"],
      .dark-mode-active .bg-gray-100.rounded-2xl {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        border-color: rgba(59, 130, 246, 0.4) !important;
        color: #f1f5f9 !important;
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2) !important;
      }
      
      /* User message specific styling */
      .dark-mode-active .message.user,
      .dark-mode-active .chat-message.user,
      .dark-mode-active div[class*="user"],
      .dark-mode-active .bg-gradient-to-r.from-primary {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
        border-color: rgba(59, 130, 246, 0.5) !important;
        color: #ffffff !important;
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3) !important;
      }
      
      /* Override any remaining white/gray backgrounds in messages */
      .dark-mode-active .bg-gray-100,
      .dark-mode-active .bg-white,
      .dark-mode-active [class*="bg-gray"],
      .dark-mode-active [class*="bg-white"] {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        color: #f1f5f9 !important;
      }
      
      /* Force text color in messages */
      .dark-mode-active .message *,
      .dark-mode-active .chat-message *,
      .dark-mode-active div[class*="message"] *,
      .dark-mode-active div[class*="chat"] *,
      .dark-mode-active .bg-gray-100 *,
      .dark-mode-active .bg-white * {
        color: #f1f5f9 !important;
      }
      
      /* Override specific text colors */
      .dark-mode-active .text-gray-800,
      .dark-mode-active .text-gray-600,
      .dark-mode-active .text-gray-500 {
        color: #f1f5f9 !important;
      }
      
      /* Ultra-specific overrides for chat elements */
      .dark-mode-active .bg-gray-100.rounded-2xl.rounded-tl-md,
      .dark-mode-active .bg-gray-100.rounded-2xl.rounded-tr-md,
      .dark-mode-active .bg-gradient-to-r.from-primary.from-primary\/80,
      .dark-mode-active .bg-gradient-to-r.from-primary.to-primary\/80 {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        color: #f1f5f9 !important;
        border: 1px solid rgba(148, 163, 184, 0.3) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
      }
      
      /* Force override for message content only - not outer containers */
      .dark-mode-active .bg-gray-100.rounded-2xl,
      .dark-mode-active .bg-white.rounded-2xl,
      .dark-mode-active .bg-gray-50.rounded-2xl {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        color: #f1f5f9 !important;
      }
      
      /* Target specific chat message containers - only the actual message bubbles */
      .dark-mode-active .space-y-4 > div > div:last-child,
      .dark-mode-active .messages-container > div > div:last-child,
      .dark-mode-active .chat-messages > div > div:last-child {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        color: #f1f5f9 !important;
        border: 1px solid rgba(148, 163, 184, 0.3) !important;
        border-radius: 16px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
      }
      
      /* Override any inline styles */
      .dark-mode-active [style*="background-color: rgb(243, 244, 246)"],
      .dark-mode-active [style*="background-color: white"],
      .dark-mode-active [style*="background: rgb(243, 244, 246)"],
      .dark-mode-active [style*="background: white"] {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        color: #f1f5f9 !important;
      }
      
      /* Chat container */
      .dark-mode-active .chat-container,
      .dark-mode-active .messages-container {
        background: rgba(30, 41, 59, 0.6) !important;
        border-radius: 20px !important;
        border: 1px solid rgba(148, 163, 184, 0.2) !important;
        backdrop-filter: blur(10px) !important;
      }
      
      /* Input area */
      .dark-mode-active .input-area,
      .dark-mode-active .chat-input-area {
        background: rgba(51, 65, 85, 0.9) !important;
        border-top: 1px solid rgba(148, 163, 184, 0.2) !important;
        backdrop-filter: blur(10px) !important;
      }
      
      /* Ensure all text is visible in dark mode */
      .dark-mode-active * {
        color: inherit !important;
      }
      
      .dark-mode-active .text-dark,
      .dark-mode-active .text-black {
        color: #f1f5f9 !important;
      }
      
      /* Status and health indicators */
      .dark-mode-active .status-badge,
      .dark-mode-active .health-indicator {
        background: rgba(51, 65, 85, 0.9) !important;
        border: 1px solid rgba(148, 163, 184, 0.3) !important;
        color: #f1f5f9 !important;
        border-radius: 20px !important;
        padding: 8px 16px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }
      
      /* Loading states */
      .dark-mode-active .loading,
      .dark-mode-active .spinner {
        color: #3b82f6 !important;
      }
      
      /* Error states */
      .dark-mode-active .error,
      .dark-mode-active .error-message {
        background: rgba(239, 68, 68, 0.1) !important;
        border: 1px solid rgba(239, 68, 68, 0.3) !important;
        color: #fca5a5 !important;
        border-radius: 8px !important;
        padding: 12px 16px !important;
      }
      
      /* Success states */
      .dark-mode-active .success,
      .dark-mode-active .success-message {
        background: rgba(16, 185, 129, 0.1) !important;
        border: 1px solid rgba(16, 185, 129, 0.3) !important;
        color: #6ee7b7 !important;
        border-radius: 8px !important;
        padding: 12px 16px !important;
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup function to restore original theme
    return () => {
      document.documentElement.setAttribute('data-bs-theme', currentTheme);
      document.documentElement.classList.remove('dark-mode-active');
      document.body.classList.remove('dark-mode-active');
      document.documentElement.style.transition = '';
      
      // Remove dark mode from all parent containers
      let parent = document.body.parentElement;
      while (parent) {
        parent.classList.remove('dark-mode-active');
        parent = parent.parentElement;
      }
      
      // Remove custom styles
      const customStyle = document.getElementById('agent-dark-mode-styles');
      if (customStyle) {
        customStyle.remove();
      }
    };
  }, []);

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

  // Initialize speech recognition with multiple fallbacks
  const initializeSpeechRecognition = () => {
    console.log('Initializing speech recognition with multiple fallbacks...');
    
    // Try multiple approaches for better macOS compatibility
    const approaches = [
      // Approach 1: Standard webkitSpeechRecognition
      () => {
        if ("webkitSpeechRecognition" in window) {
          const recognition = new (window as any).webkitSpeechRecognition();
          recognition.continuous = false; // More reliable on macOS
          recognition.interimResults = false; // More reliable on macOS
          recognition.lang = "en-US";
          recognition.maxAlternatives = 1;
          return recognition;
        }
        return null;
      },
      
      // Approach 2: Alternative macOS settings
      () => {
        if ("webkitSpeechRecognition" in window) {
          const recognition = new (window as any).webkitSpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.maxAlternatives = 1;
          recognition.lang = "en-US";
          return recognition;
        }
        return null;
      },
      
      // Approach 3: Try standard SpeechRecognition
      () => {
        if ("SpeechRecognition" in window) {
          const recognition = new (window as any).SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = "en-US";
          recognition.maxAlternatives = 1;
          return recognition;
        }
        return null;
      }
    ];
    
    let recognition = null;
    let approachIndex = 0;
    
    for (let i = 0; i < approaches.length; i++) {
      try {
        recognition = approaches[i]();
        if (recognition) {
          approachIndex = i;
          console.log(`Speech recognition approach ${i + 1} successful`);
          break;
        }
      } catch (error) {
        console.log(`Approach ${i + 1} failed:`, error);
      }
    }
    
    if (recognition) {
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
        
        // Try next approach on error
        if (e.error === 'network' || e.error === 'audio-capture' || e.error === 'not-allowed') {
          console.log(`Approach ${approachIndex + 1} failed, trying next approach...`);
          setTimeout(() => {
            tryNextApproach(approachIndex + 1);
          }, 1000);
        }
      };

      recognition.onresult = (event: any) => {
        console.log('Speech recognition result:', event);
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }
        setInputValue(prev => prev + text);
      };

      // Store the recognition instance
      recognitionRef.current = recognition;
      
      // Expose start/stop functions globally for debugging
      (window as any).startRecognition = () => recognition.start();
      (window as any).stopRecognition = () => recognition.stop();
      
      console.log('Speech recognition initialized successfully');
      setIsSpeechSupported(true);
      
    } else {
      console.error('All speech recognition approaches failed');
      setIsSpeechSupported(false);
    }
  };

  // Try next approach when current one fails
  const tryNextApproach = (currentIndex: number) => {
    if (currentIndex >= 3) {
      console.log('All approaches exhausted, trying macOS-specific workaround...');
      
      // On macOS, try a different approach that mimics ChatGPT
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if (isMac) {
        tryMacOSWorkaround();
      } else {
        setIsSpeechSupported(false);
      }
      return;
    }
    
    console.log(`Trying approach ${currentIndex + 1}...`);
    initializeSpeechRecognition();
  };

  // macOS-specific workaround that mimics ChatGPT's approach
  const tryMacOSWorkaround = () => {
    console.log('Trying macOS-specific workaround...');
    
    // Create a new recognition instance with minimal settings
    try {
      const recognition = new (window as any).webkitSpeechRecognition();
      
      // Use the most basic settings possible
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = "en-US";
      
      // Remove all event listeners and add minimal ones
      recognition.onstart = () => {
        console.log('macOS workaround: Speech recognition started');
        setIsListening(true);
      };
      
      recognition.onend = () => {
        console.log('macOS workaround: Speech recognition ended');
        setIsListening(false);
      };
      
      recognition.onerror = (e: any) => {
        console.error('macOS workaround: Speech recognition error:', e);
        setIsListening(false);
        
        // On macOS, just show a helpful message instead of retrying
        if (e.error === 'network') {
          alert('Speech recognition network error on macOS. This is a known issue. Please try:\n\n1. Using Chrome instead of Safari\n2. Refreshing the page\n3. Typing your message instead');
        }
      };
      
      recognition.onresult = (event: any) => {
        console.log('macOS workaround: Speech recognition result:', event);
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }
        setInputValue(prev => prev + text);
      };
      
      recognitionRef.current = recognition;
      (window as any).startRecognition = () => recognition.start();
      (window as any).stopRecognition = () => recognition.stop();
      
      console.log('macOS workaround successful');
      setIsSpeechSupported(true);
      
    } catch (error) {
      console.error('macOS workaround failed:', error);
      setIsSpeechSupported(false);
      alert('Speech recognition not available on this macOS system. Please type your messages instead.');
    }
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

  // Check microphone permissions with macOS-specific handling
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
          message += 'On macOS, please:\n1. Check System Preferences > Security & Privacy > Microphone\n2. Make sure your browser is allowed\n3. Refresh the page and try again\n\nNote: If speech recognition still fails, try using Chrome instead of Safari';
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



  // Handle voice input
  const handleVoiceInput = async () => {
    console.log('Voice input requested, current state:', { 
      hasRecognition: !!recognitionRef.current, 
      isListening, 
      isSpeechSupported 
    });
    
    if (!recognitionRef.current) {
      console.log('No speech recognition instance, reinitializing...');
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
      } catch (error) {
        console.log('Speech recognition already stopped');
      }
    } else {
      // Check microphone permission first
      console.log('Checking microphone permissions...');
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        console.log('Microphone permission denied or cancelled');
        return;
      }
      
      // Start listening - clear input and start fresh
      console.log('Starting speech recognition...');
      setInputValue('');
      
      try {
        recognitionRef.current.start();
        console.log('Speech recognition started successfully');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        // Simple restart on error
        setTimeout(() => {
          initializeSpeechRecognition();
        }, 1000);
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
    <div className="h-[calc(100vh-170px)] flex flex-col" >
      {/* Welcome State - Show when no messages */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* Welcome Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Replenishment AI Agent</h1>
            <p className="text-gray-600 text-lg">AI-powered demand forecasting and inventory optimization</p>
          </div>
          
          {/* Main Input Box */}
          <div className="w-full max-w-2xl mb-8">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about replenishment..."
                className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all bg-white/90 shadow-lg"
              />
              
              {/* Voice Button */}
              {isSpeechSupported && (
                <button
                  onClick={handleVoiceInput}
                  className={`absolute right-4 top-1 w-10 h-10 rounded-full flex items-center justify-center ${
                    isListening 
                      ? 'bg-red-500 text-white a shadow-lg' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={isListening ? 'Click to stop listening' : 'Click to start voice input'}
                >
                  <i className={`ri-${isListening ? 'stop-line' : 'mic-line'} text-lg`}></i>
                </button>
              )}
              
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="absolute right-16 top-1 w-10 h-10 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="ri-send-plane-fill text-lg"></i>
              </button>
            </div>
          </div>
          
          {/* Suggestion Buttons */}
          <div className="w-full max-w-2xl">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setInputValue("Help me optimize my inventory levels");
                  handleSendMessage();
                }}
                className="flex items-center space-x-2 px-4 py-3 bg-white/80 hover:bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
              >
                <i className="ri-bar-chart-line text-primary text-lg"></i>
                <span className="text-gray-700 font-medium">Optimize Inventory</span>
              </button>
              
              <button
                onClick={() => {
                  setInputValue("Generate demand forecast for next quarter");
                  handleSendMessage();
                }}
                className="flex items-center space-x-2 px-4 py-3 bg-white/80 hover:bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
              >
                <i className="ri-trending-up-line text-primary text-lg"></i>
                <span className="text-gray-700 font-medium">Demand Forecast</span>
              </button>
              
              <button
                onClick={() => {
                  setInputValue("Analyze my replenishment performance");
                  handleSendMessage();
                }}
                className="flex items-center space-x-2 px-4 py-3 bg-white/80 hover:bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
              >
                <i className="ri-analytics-line text-primary text-lg"></i>
                <span className="text-gray-700 font-medium">Performance Analysis</span>
              </button>
              
              <button
                onClick={() => {
                  setInputValue("What can you help me with?");
                  handleSendMessage();
                }}
                className="flex items-center space-x-3 px-4 py-3 bg-white/80 hover:bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
              >
                <i className="ri-lightbulb-line text-primary text-lg"></i>
                <span className="text-gray-700 font-medium">Get Advice</span>
              </button>
              
              <button
                onClick={() => {
                  setInputValue("Create a replenishment plan");
                  handleSendMessage();
                }}
                className="flex items-center space-x-2 px-4 py-3 bg-white/80 hover:bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
              >
                <i className="ri-file-list-line text-primary text-lg"></i>
                <span className="text-gray-700 font-medium">Create Plan</span>
              </button>
              
              <button
                onClick={() => {
                  setInputValue("Surprise me with insights");
                  handleSendMessage();
                }}
                className="flex items-center space-x-2 px-4 py-3 bg-white/80 hover:bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
              >
                <i className="ri-gift-line text-primary text-lg"></i>
                <span className="text-gray-700 font-medium">Surprise Me</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Chat Messages - Show when conversation starts */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4 pb-0 space-y-4" >
          {messages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3  ${
              message.type === 'user' ? 'justify-end' : ''
            }` } >
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
      )}

            {/* Chat Input - Only show when conversation has started */}
      {messages.length > 0 && (
        <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm p-4 pt-3">
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
                  className={`absolute right-16 top-2 w-8 h-8 rounded-full flex items-center justify-center ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={isListening ? 'Click to start voice input' : 'Click to start voice input'}
                >
                  <i className={`ri-${isListening ? 'stop-line' : 'mic-line'} text-sm`}></i>
                </button>
              )}
              
              {/* Fallback button when speech recognition fails */}
              {!isSpeechSupported && (
                <button
                  onClick={() => {
                    alert('Speech recognition is not available. Please type your message instead.');
                  }}
                  className="absolute right-16 top-2 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600"
                  title="Speech recognition not available"
                >
                  <i className="ri-mic-off-line text-sm"></i>
                </button>
              )}
              
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="absolute right-2 top-2 w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="ri-send-plane-fill text-sm"></i>
              </button>
            </div>
          </div>
          {isListening && (
            <div className="mt-2 text-xs text-center">
              <div className="flex items-center justify-center space-x-2 text-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>Listening... Speak now</span>
              </div>
            </div>
                     )}
         </div>
       )}
      </div>
    );
  };

export default AgentChat;
