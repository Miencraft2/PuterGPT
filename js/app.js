import { state, els } from './state.js';
import { resizeInput, handleInputKey, sendMessage } from './chat.js';
import { loadModels, filterModels, updateCostDisplay } from './models.js';
import { loadSavedChats } from './storage.js';
import { initializeTokenManagement } from './token-ui.js';
import { migrateFromLocalStorage, db } from './indexeddb-storage.js';
import { setState, subscribe } from './store.js';
import { deepDiff } from './utils.js';
import './search-ui.js'; // Initializes search UI globally

// Main Application Initialization
window.addEventListener('load', async () => {
    // Perform migration if needed
    await migrateFromLocalStorage();

    // Load settings from IndexedDB
    await import('./state.js').then(m => m.loadSettingsFromDB());

    // Initialize Token Management first
    await initializeTokenManagement();
    
    // Set up reactive state subscriptions
    subscribe((newState, prevState) => {
        // Auto-scroll when messages change and auto-scroll is enabled
        if (newState.messages !== prevState.messages && newState.config.autoScroll) {
            setTimeout(() => {
                els.chatContainer.scrollTop = els.chatContainer.scrollHeight;
            }, 100);
        }
        
        // Update model select when config changes
        if (newState.config?.modelId !== prevState.config?.modelId) {
            els.modelSelect.value = newState.config.modelId;
        }
        
        // Update system prompt when config changes
        if (newState.config?.systemPrompt !== prevState.config?.systemPrompt) {
            els.systemPrompt.value = newState.config.systemPrompt;
        }
        
        // Update auto-scroll checkbox when config changes
        if (newState.config?.autoScroll !== prevState.config?.autoScroll) {
            els.autoScroll.checked = newState.config.autoScroll;
        }
        
        // Update enable web search checkbox when config changes
        if (newState.config?.enableWebSearch !== prevState.config?.enableWebSearch) {
            if (els.enableWebSearch) els.enableWebSearch.checked = newState.config.enableWebSearch;
        }

        // Update send button icon based on operation state
        const isGenerating = newState.lastOperationId && 
                           newState.messages.some(m => m.role === 'assistant' && m.content === '');
        const sendBtnIcon = els.sendBtn.querySelector('.material-icons-outlined');
        if (sendBtnIcon) {
            sendBtnIcon.textContent = isGenerating ? 'stop' : 'send';
        }

        // Log state changes for debugging
        const changes = deepDiff(newState, prevState);
        if (Object.keys(changes).length > 0) {
            console.log('State changes:', changes);
        }
    });
    
    // Restore Config from IndexedDB (already loaded above)
    els.systemPrompt.value = state.config.systemPrompt;
    els.autoScroll.checked = state.config.autoScroll;
    if (els.enableWebSearch) els.enableWebSearch.checked = state.config.enableWebSearch;
    
    // Load Chats and Models
    await loadSavedChats();
    await loadModels();
    
    // Initialize Image Handling
    initializeImageHandling();
    
    // Check for shared chat URL
    import('./export.js').then(m => m.loadSharedChat());
    
    // Initialize Import Handling
    initializeImportHandling();
    
    // Event Listeners
    els.input.addEventListener('keydown', handleInputKey);
    els.input.addEventListener('input', resizeInput);
    els.modelSearch.addEventListener('input', filterModels);
    els.freeOnlyFilter.addEventListener('change', filterModels);
    els.modelSelect.addEventListener('change', async (e) => {
        setState((state) => ({
            config: { ...state.config, modelId: e.target.value }
        }));
        await db.settings.put({ key: 'model', value: e.target.value });
        updateCostDisplay();
    });
    els.systemPrompt.addEventListener('change', async (e) => {
        setState((state) => ({
            config: { ...state.config, systemPrompt: e.target.value }
        }));
        await db.settings.put({ key: 'system_prompt', value: e.target.value });
    });
    if (els.enableWebSearch) {
        els.enableWebSearch.addEventListener('change', async (e) => {
            setState((state) => ({
                config: { ...state.config, enableWebSearch: e.target.checked }
            }));
            await db.settings.put({ key: 'enable_web_search', value: e.target.checked });
        });
    }
});

// Make sendMessage available globally for the HTML onclick
window.sendMessage = sendMessage;

// Handle send button click - determines whether to send message or abort generation
window.handleSendButtonClick = () => {
    const isGenerating = state.lastOperationId && 
                       state.messages.some(m => m.role === 'assistant' && m.content === '');
    
    if (isGenerating) {
        abortAssistantResponse();
    } else {
        sendMessage();
    }
};

// Import and make abortAssistantResponse available globally
import('./chat-api.js').then(m => {
    window.abortAssistantResponse = m.abortAssistantResponse;
});

// Image Handling Initialization
async function initializeImageHandling() {
    const { imageUtils } = await import('./image-utils.js');
    
    // File input change handler
    const imageInput = document.getElementById('image-input');
    imageInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        await imageUtils.handleFileInput(files);
        // Reset input so same file can be selected again
        e.target.value = '';
    });
    
    // Paste handler for textarea
    els.input.addEventListener('paste', imageUtils.handlePaste.bind(imageUtils));
    
    // Drag and drop handlers for the main chat area
    const mainArea = document.getElementById('main');
    mainArea.addEventListener('dragover', imageUtils.handleDragOver);
    mainArea.addEventListener('dragleave', imageUtils.handleDragLeave);
    mainArea.addEventListener('drop', imageUtils.handleDrop.bind(imageUtils));
}

// Import Handling Initialization
function initializeImportHandling() {
    const importInput = document.getElementById('import-input');
    importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const jsonData = JSON.parse(text);
            import('./export.js').then(m => m.importChatFromJson(jsonData));
        } catch (error) {
            console.error('Failed to read import file:', error);
            import('./ui.js').then(m => m.showToast('Failed to import chat: Invalid JSON file'));
        } finally {
            // Reset input so same file can be selected again
            e.target.value = '';
        }
    });
}
