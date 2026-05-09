# PuterGPT

A modern, feature-rich web-based chat application that integrates with the Puter.ai API to provide AI-powered conversations. Built with vanilla JavaScript, HTML5, and CSS3, PuterGPT offers a sleek interface with advanced features like token management, chat history, image support, and more.

## ✨ Features

### Core Functionality
- **AI Chat Interface**: Clean, responsive chat UI with message threading
- **Multiple AI Models**: Support for various Puter.ai models with cost estimation
- **Token Management**: Advanced token system with rotation, import/export, and quick registration
- **Chat History**: Persistent storage using IndexedDB with import/export capabilities
- **Real-time Streaming**: Live response streaming for immediate feedback

### Advanced Features
- **Image Support**: Upload, paste, or drag-and-drop images for vision-capable models
- **Web Search Integration**: Enable web search for supported models
- **Message Editing**: Edit previous messages and regenerate responses
- **Search Functionality**: Full-text search across chat history (Ctrl+Shift+F)
- **Responsive Design**: Mobile-friendly interface with collapsible sidebar
- **Theme System**: Advanced theming with built-in dark/light modes and AI-powered custom theme generation
- **Markdown Support**: Rich text rendering with syntax highlighting
- **Cost Tracking**: Real-time token usage and cost estimation

### Theme System
- **Built-in Themes**: Dark and light themes with comprehensive styling
- **AI-Powered Theme Generation**: Create custom themes using AI with natural language descriptions
- **Custom Theme Management**: Create, apply, edit, and delete custom themes
- **JavaScript Enhancements**: Optional JavaScript effects and animations for custom themes
- **Theme Persistence**: Custom themes saved locally and in IndexedDB for backup
- **Advanced CSS Variables**: Extensive customization options for all UI elements
- **Theme Utilities**: Built-in utilities for dynamic theme manipulation and effects

### Token Management
- **Multi-token Support**: Manage multiple API tokens simultaneously
- **Token Rotation**: Automatic failover when tokens hit limits
- **Quick Registration**: Fast token setup via Puter integration
- **Import/Export**: Backup and restore token configurations
- **Usage Monitoring**: Track token usage and limits

## 🚀 Quick Start

### Live Demo
**Access the application directly at**: https://noname-isaidnoname.github.io/PuterGPT/

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Puter.ai API token(s)

### First Time Setup
1. Open the application at https://noname-isaidnoname.github.io/PuterGPT/
2. Click "Configure Tokens" or "Quick Register (via Puter)"
3. Enter your Puter.ai API token
4. Select your preferred AI model
5. Start chatting!

## 🏠 Local Setup

### Running Locally
If you prefer to run the application locally:

1. **Clone or Download** the repository:
   ```bash
   git clone https://github.com/noname-isaidnoname/PuterGPT.git
   cd PuterGPT
   ```

2. **Start a Local Server**:
   - **Using Python**:
     ```bash
     python -m http.server 8000
     ```
   - **Using Node.js**:
     ```bash
     npx http-server -p 8000
     ```
   - **Using PHP**:
     ```bash
     php -S localhost:8000
     ```

3. **Open in Browser**:
   - Navigate to `http://localhost:8000`

4. **Configure API Token**:
   - Click "Settings & AI Config" in the sidebar
   - Add your Puter.ai authentication token
   - Or use "Quick Register (via Puter)" for fast setup


## 🔧 Configuration

### API Token Setup
1. **Manual Setup**:
   - Go to Settings & AI Config
   - Enter token name and Puter.ai authentication token
   - Click "Add" to save

2. **Quick Registration**:
   - Click "Quick Register (via Puter)"
   - Follow the authentication flow
   - Token will be automatically added

### Model Selection
- Choose from available Puter.ai models
- View model capabilities (vision, search, etc.)
- See estimated costs per token
- Filter by free/paid models

### Customization
- **System Prompt**: Customize AI behavior in settings
- **Auto-scroll**: Toggle automatic message scrolling
- **Web Search**: Enable for supported models
- **Theme Selection**: Choose from built-in dark/light themes or create custom themes
- **AI Theme Generation**: Use natural language to describe and generate custom themes
- **Theme Management**: Apply, edit, or delete custom themes with persistence

#### Theme Customization
- **Built-in Themes**: Dark and light themes with comprehensive styling
- **Custom Theme Creation**: AI-powered theme generation with natural language prompts
- **JavaScript Effects**: Optional animations and interactive elements for themes
- **CSS Variables**: 50+ customizable variables for complete UI control
- **Theme Utilities**: Built-in functions for dynamic theme manipulation

## 🎯 Usage Guide

### Basic Chatting
1. Type your message in the input area
2. Press Enter to send (Shift+Enter for new line)
3. View AI responses in real-time
4. Continue conversation naturally

### Advanced Features

#### Image Upload
- Click the image button to upload files
- Paste images directly (Ctrl+V)
- Drag and drop images onto the chat area
- Works with vision-capable models

#### Message Management
- Hover over messages to reveal edit options
- Click the pencil icon to edit previous messages
- Use "Regenerate" to get new AI responses

#### Search
- Press Ctrl+Shift+F to open search
- Search across all chat history
- Click results to jump to specific messages

#### Theme Management
- **Apply Themes**: Select from built-in dark/light themes in Settings
- **Generate Custom Themes**: Click "Generate Custom Theme" and describe your desired style
- **AI Theme Creation**: Use natural language prompts like "calming ocean theme with blues"
- **JavaScript Effects**: Enable optional animations and interactive elements
- **Delete Custom Themes**: Remove unwanted custom themes (built-in themes protected)
- **Theme Persistence**: Custom themes automatically saved and backed up

#### Chat Management
- Click "New Chat" to start fresh conversations
- Access chat history in the sidebar
- Import/export chats for backup
- Share chats via URL

## 🔒 Security & Privacy

### Data Storage
- **Local Storage**: All data stored locally in IndexedDB
- **Client-side Application**: Runs entirely in your browser
- **Token Security**: API tokens stored locally with encryption options
- **Privacy**: No data sent to third parties except Puter.ai API

### Best Practices
- Keep your API tokens secure
- Regularly export your chat history as backup
- Use token rotation for heavy usage
- Clear browser data if needed

## 🛠️ Development

### Technologies Used
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage**: IndexedDB for persistence
- **API**: Puter.ai REST API with streaming
- **UI**: Material Design Icons, Custom CSS
- **Build**: No build process required (static files)

### Code Architecture
- **Modular Design**: ES6 modules for maintainability
- **State Management**: Custom Zustand-like store
- **Component-based**: Separated UI and logic
- **Event-driven**: Reactive state updates
- **Error Handling**: Comprehensive error management

### Adding Features
1. Create new modules in `js/` directory
2. Add corresponding styles in `css/`
3. Update `index.html` if needed
4. Follow existing patterns and conventions

## 🐛 Troubleshooting

### Common Issues

#### API Connection Problems
- Verify your Puter.ai token is valid
- Check internet connectivity
- Try token rotation if limits reached

#### Storage Issues
- Clear browser cache if needed
- Export chats before clearing data
- Check browser IndexedDB support

#### Performance Issues
- Limit chat history size
- Disable auto-scroll for long conversations
- Use lighter models for faster responses

### Getting Help
- Check browser console for errors
- Verify all files are present
- Ensure modern browser support
- Test with different browsers if needed

## 📞 Support

For issues related to:
- **PuterGPT Application**: Create GitHub issues
- **Puter.ai API**: Check Puter.ai documentation
- **General Questions**: Refer to this README

---
