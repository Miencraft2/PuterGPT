// State Management Module - Updated to use Zustand-like store
import { db } from './indexeddb-storage.js';
import { getState, setState } from './store.js';

// Backward compatibility - export state proxy that mirrors store state
export const state = new Proxy({}, {
  get(target, prop) {
    const currentState = getState();
    if (prop in currentState) {
      return currentState[prop];
    }
    return target[prop];
  },
  set(target, prop, value) {
    setState({ [prop]: value });
    return true;
  },
  has(target, prop) {
    const currentState = getState();
    return prop in currentState || prop in target;
  },
  ownKeys(target) {
    const currentState = getState();
    return [...Object.keys(currentState), ...Object.keys(target)];
  },
  getOwnPropertyDescriptor(target, prop) {
    const currentState = getState();
    if (prop in currentState) {
      return {
        enumerable: true,
        configurable: true,
        value: currentState[prop]
      };
    }
    return Object.getOwnPropertyDescriptor(target, prop);
  }
});

// Async function to load settings from IndexedDB
export async function loadSettingsFromDB() {
    try {
        const [savedPrompt, savedScroll, savedModel, savedRotation, savedWebSearch] = await Promise.all([
            db.settings.get('system_prompt'),
            db.settings.get('auto_scroll'),
            db.settings.get('model'),
            db.settings.get('token_rotation'),
            db.settings.get('enable_web_search')
        ]);

        const configUpdates = {};
        if (savedPrompt) configUpdates.systemPrompt = savedPrompt.value;
        if (savedScroll !== undefined) configUpdates.autoScroll = savedScroll.value;
        if (savedModel) configUpdates.modelId = savedModel.value;
        if (savedRotation !== undefined) configUpdates.tokenRotation = savedRotation.value;
        if (savedWebSearch !== undefined) configUpdates.enableWebSearch = savedWebSearch.value;

        // Update config through store
        if (Object.keys(configUpdates).length > 0) {
            setState((state) => ({
                config: { ...state.config, ...configUpdates }
            }));
        }

        // Also update original settings for comparison
        const currentState = getState();
        setState({
            originalSettings: { ...currentState.config }
        });
    } catch (error) {
        console.error('Failed to load settings from DB:', error);
        
        // Show user feedback for critical errors
        if (error.name === 'QuotaExceededError') {
            showToast('Storage quota exceeded. Please clear some data and refresh.', 'error');
        } else if (error.name === 'InvalidStateError') {
            showToast('Database error. Please refresh the page.', 'error');
        } else {
            // For other errors, show a subtle warning
            showToast('Using default settings due to loading error.', 'warning');
        }
        
        // Ensure we have default settings as fallback
        const currentState = getState();
        setState({
            originalSettings: { ...currentState.config }
        });
    }
}

export const els = {
    chatContainer: document.getElementById('chat-container'),
    input: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    modelSelect: document.getElementById('model-select'),
    modelSearch: document.getElementById('model-search'),
    freeOnlyFilter: document.getElementById('free-only-filter'),
    modelCostDisplay: document.getElementById('model-cost-display'),
    systemPrompt: document.getElementById('system-prompt'),
    settingsModal: document.getElementById('settings-modal'),
    settingsConfirmModal: document.getElementById('settings-confirm-modal'),
    toast: document.getElementById('toast'),
    sideBar: document.getElementById('sidebar'),
    autoScroll: document.getElementById('auto-scroll'),
    enableWebSearch: document.getElementById('enable-web-search'),
    savedChatsContainer: document.getElementById('saved-chats-container'),
    // Token management elements
    tokenList: document.getElementById('token-list'),
    tokenName: document.getElementById('token-name'),
    tokenValue: document.getElementById('token-value'),
    addTokenBtn: document.getElementById('add-token-btn'),
    tokenRotation: document.getElementById('token-rotation'),
    importTokensBtn: document.getElementById('import-tokens-btn'),
    exportTokensBtn: document.getElementById('export-tokens-btn'),
    tokenGuideBtn: document.getElementById('token-guide-btn'),
    // Search elements (will be created dynamically)
    searchModal: null,
    searchInput: null,
    searchResults: null
};

// Function to check if settings have been changed
export function hasSettingsChanged() {
    const currentSystemPrompt = els.systemPrompt.value;
    const currentModelId = els.modelSelect.value;
    const currentAutoScroll = els.autoScroll.checked;
    const currentTokenRotation = els.tokenRotation.checked;
    const currentEnableWebSearch = els.enableWebSearch ? els.enableWebSearch.checked : false;
    
    const currentState = getState();
    
    return (
        currentSystemPrompt !== currentState.originalSettings.systemPrompt ||
        currentModelId !== currentState.originalSettings.modelId ||
        currentAutoScroll !== currentState.originalSettings.autoScroll ||
        currentTokenRotation !== currentState.originalSettings.tokenRotation ||
        currentEnableWebSearch !== currentState.originalSettings.enableWebSearch
    );
}

// Function to reset settings to original values
export function resetSettingsToOriginal() {
    const currentState = getState();
    els.systemPrompt.value = currentState.originalSettings.systemPrompt;
    els.modelSelect.value = currentState.originalSettings.modelId;
    els.autoScroll.checked = currentState.originalSettings.autoScroll;
    els.tokenRotation.checked = currentState.originalSettings.tokenRotation;
    if (els.enableWebSearch) els.enableWebSearch.checked = currentState.originalSettings.enableWebSearch;
}
