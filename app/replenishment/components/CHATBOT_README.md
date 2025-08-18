# 🤖 Chatbot API Documentation

## Overview
The chatbot system provides an intelligent interface for users to query analytics, product, and replenishment data using natural language. It uses predefined question patterns to match user input and return relevant data from your existing APIs.

## 🚀 Quick Start

### 1. Start your backend server
```bash
npm start
# or
node src/index.js
```

### 2. Test the chatbot
```bash
# Test a simple question
curl -X POST http://localhost:3000/api/v1/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "show me top 5 products"}'
```

## 📍 API Endpoints

### Main Chat Endpoint
- **POST** `/api/v1/chatbot/chat`
- **Body**: `{"message": "your question here"}`
- **Response**: Processed response with data

### Utility Endpoints
- **GET** `/api/v1/chatbot/questions` - Get all predefined questions
- **GET** `/api/v1/chatbot/suggestions?category=analytics` - Get questions by category
- **GET** `/api/v1/chatbot/help` - Get chatbot help
- **GET** `/api/v1/chatbot/demo` - Get demo responses

## 💬 Predefined Questions

### Analytics Questions
| Question | Description | Response |
|----------|-------------|----------|
| `show me top 5 products` | Get top 5 performing products | Product performance data |
| `show me top 5 stores` | Get top 5 performing stores | Store performance data |
| `what are the sales trends` | Get sales trends over time | Time-based sales data |
| `show me store performance` | Get overall store performance | Store analytics |
| `show me product performance` | Get overall product performance | Product analytics |
| `what is the discount impact` | Analyze discount impact | Discount analysis data |
| `show me tax and MRP analytics` | Get tax and MRP data | Tax/MRP analytics |
| `show me summary KPIs` | Get key performance indicators | Summary KPIs |
| `show me the analytics dashboard` | Get comprehensive dashboard | Full analytics data |

### Product Questions
| Question | Description | Response |
|----------|-------------|----------|
| `how many products do we have` | Get total product count | Product count |
| `show me active products` | Get all active products | Active products list |
| `find product by name` | Search product by name | Product search results |
| `show me products by category` | Filter products by category | Category products |

### Replenishment Questions
| Question | Description | Response |
|----------|-------------|----------|
| `show me replenishment recommendations` | Get replenishment suggestions | Replenishment data |
| `calculate replenishment for store` | Calculate for specific store | Replenishment calculation |
| `show me all replenishments` | Get all replenishment records | All replenishments |

### General Questions
| Question | Description | Response |
|----------|-------------|----------|
| `help` | Show available commands | Help information |
| `what can you do` | Show chatbot capabilities | Capabilities list |

## 🔍 How It Works

### 1. Message Processing
```
User Input → Normalize → Pattern Matching → Action Execution → Response
```

### 2. Pattern Matching
- **Exact Match**: Perfect question matches
- **Partial Match**: Similar question patterns
- **Keyword Match**: Smart keyword detection

### 3. Action Execution
- Routes to appropriate service (analytics, product, replenishment)
- Calls existing API functions
- Returns formatted data

## 📱 Frontend Integration

### Basic Chat Implementation
```javascript
// Send message to chatbot
const sendMessage = async (message) => {
  try {
    const response = await fetch('/api/v1/chatbot/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });
    
    const data = await response.json();
    
    // Display the HTML response with charts and tables
    if (data.html) {
      document.getElementById('chatContainer').innerHTML = data.html;
      
      // Re-execute Chart.js scripts if they exist
      const scripts = document.getElementById('chatContainer').getElementsByTagName('script');
      for (let script of scripts) {
        eval(script.innerHTML);
      }
    }
    
    return data;
  } catch (error) {
    console.error('Chat error:', error);
  }
};

// Example usage
sendMessage('show me top 5 products').then(response => {
  console.log('Chat response:', response);
  // HTML will be automatically rendered in chatContainer
});
```

### Get Predefined Questions
```javascript
// Get all available questions for UI suggestions
const getQuestions = async () => {
  const response = await fetch('/api/v1/chatbot/questions');
  const data = await response.json();
  return data.data;
};
```

## 🧪 Testing

### Using Postman
1. Import the `chatbot.postman_collection.json` file
2. Set your `baseUrl` variable
3. Test different predefined questions

### Using cURL
```bash
# Test analytics
curl -X POST http://localhost:3000/api/v1/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "show me top 5 stores"}'

# Test products
curl -X POST http://localhost:3000/api/v1/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "how many products do we have"}'

# Test replenishment
curl -X POST http://localhost:3000/api/v1/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "show me replenishment recommendations"}'
```

### Using the Demo Endpoint
```bash
# Get demo responses for all common questions
curl http://localhost:3000/api/v1/chatbot/demo
```

## 🎯 Response Format

### Success Response
```json
{
  "success": true,
  "type": "success",
  "message": "Here's what I found for: \"show me top 5 products\"",
  "data": {
    // Actual data from your services
  },
  "question": {
    "type": "analytics",
    "action": "getTopProducts",
    "description": "Get top 5 performing products"
  },
  "html": "<div class='chart-container'>...</div>"
}
```

### HTML Response Types
The chatbot now generates rich HTML responses with:

- **📊 Charts**: Bar charts, line charts, pie charts using Chart.js
- **📋 Tables**: Responsive data tables with sorting
- **🎯 KPI Cards**: Summary cards with metrics and trends
- **📈 Dashboards**: Comprehensive visualizations
- **🎨 Styled Components**: Beautiful, responsive UI elements

### Error Response
```json
{
  "success": true,
  "type": "error",
  "message": "I'm not sure how to help with that. Try asking for \"help\" to see what I can do.",
  "suggestions": [
    "Try: \"show me top 5 products\"",
    "Try: \"what are the sales trends\""
  ]
}
```

## 🔧 Customization

### Adding New Questions
1. Add to `PREDEFINED_QUESTIONS` in `chatbot.service.js`
2. Implement corresponding action in `executeAction` functions
3. Add validation if needed

### Modifying Responses
- Edit the service functions to change data processing
- Modify response formatting in the controller
- Add new response types as needed

## 📊 Performance Tips

1. **Caching**: Consider caching frequent responses
2. **Rate Limiting**: Implement rate limiting for chat endpoints
3. **Error Handling**: Graceful fallbacks for service failures
4. **Logging**: Log user interactions for improvement

## 🚨 Troubleshooting

### Common Issues
1. **Service not found**: Check if all services are properly imported
2. **Database connection**: Ensure MongoDB connection is active
3. **Validation errors**: Check request body format
4. **Service errors**: Verify service functions exist and work

### Debug Mode
```bash
# Check if chatbot routes are loaded
curl http://localhost:3000/api/v1/chatbot/help

# Test with simple message
curl -X POST http://localhost:3000/api/v1/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "help"}'
```

## 🎉 Demo for Clients

### Quick Demo Questions
1. `show me top 5 products` - Shows product performance
2. `show me top 5 stores` - Shows store performance  
3. `what are the sales trends` - Shows sales analytics
4. `help` - Shows all available commands
5. `what can you do` - Shows chatbot capabilities

### Demo Response Endpoint
Use `/api/v1/chatbot/demo` to get responses for all demo questions at once.

### HTML Demo
Open `chatbot-demo.html` in your browser to see the chatbot HTML responses in action with:
- Interactive charts and graphs
- Responsive data tables
- KPI dashboards
- Beautiful styling and animations

---

**Ready to impress your clients! 🚀**

The chatbot system is now fully integrated and ready to demonstrate intelligent data querying capabilities using natural language.
