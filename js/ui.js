import { els, state, hasSettingsChanged, resetSettingsToOriginal } from './state.js';
import { loadSavedChats } from './storage.js';
import { db } from './indexeddb-storage.js';
import { setState, getState, subscribe } from './store.js';

// Set up reactive subscription to update image preview when attached images change
subscribe((newState, prevState) => {
    if (newState.attachedImages !== prevState.attachedImages) {
        updateImagePreview();
    }
});

// UI Utilities
export function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    els.toast.classList.remove('hiding');
    setTimeout(() => {
        els.toast.classList.remove('show');
        els.toast.classList.add('hiding');
        setTimeout(() => {
            els.toast.classList.remove('hiding');
        }, 250);
    }, 2500);
}

export function scrollToBottom() {
    const shouldScroll = els.autoScroll ? els.autoScroll.checked : true;
    if(shouldScroll) els.chatContainer.scrollTop = els.chatContainer.scrollHeight;
}

// Global Actions
window.toggleSidebar = () => els.sideBar.classList.toggle('open');

// Image Preview Management
export async function updateImagePreview() {
    const { state, els } = await import('./state.js');
    const imagePreview = document.getElementById('image-preview');

    if (state.attachedImages.length === 0) {
        imagePreview.style.display = 'none';
        imagePreview.innerHTML = '';
        return;
    }

    imagePreview.style.display = 'flex';
    imagePreview.innerHTML = '';

    state.attachedImages.forEach((imageData, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';

        const img = document.createElement('img');
        img.src = imageData.dataUrl;
        img.alt = imageData.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = async () => {
            const { imageUtils } = await import('./image-utils.js');
            await imageUtils.removeImage(index);
        };

        imageItem.appendChild(img);
        imageItem.appendChild(removeBtn);
        imagePreview.appendChild(imageItem);
    });
}
let activeContextChatId = null;
const contextMenu = document.getElementById('chat-context-menu');

export function showChatContextMenu(e, chatId) {
    activeContextChatId = chatId;
    contextMenu.classList.add('active');
    
    // Position menu
    const rect = e.currentTarget.getBoundingClientRect();
    contextMenu.style.top = `${rect.bottom + 5}px`;
    contextMenu.style.left = `${rect.right - contextMenu.offsetWidth}px`;
    
    // Close on click outside
    const closeMenu = (event) => {
        if (!contextMenu.contains(event.target)) {
            contextMenu.classList.remove('active');
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
}
window.showChatContextMenu = showChatContextMenu;

window.handleRenameChat = async () => {
    const chat = await db.chats.get(activeContextChatId);
    const newTitle = prompt("Rename chat:", chat ? chat.title : "");
    if (newTitle !== null) {
        import('./storage.js').then(m => m.renameChat(activeContextChatId, newTitle));
    }
    contextMenu.classList.remove('active');
};

window.handleDeleteChat = () => {
    if (confirm("Delete this chat?")) {
        window.deleteChat(activeContextChatId);
    }
    contextMenu.classList.remove('active');
};

window.handleExportChat = () => {
    import('./export.js').then(m => m.exportChatAsJson(activeContextChatId));
    contextMenu.classList.remove('active');
};

window.handleShareChat = () => {
    import('./export.js').then(m => m.shareChat(activeContextChatId));
    contextMenu.classList.remove('active');
};

window.importChat = () => {
    const importInput = document.getElementById('import-input');
    importInput.click();
};

window.newChat = () => {
    setState({
        messages: [],
        currentChatId: null,
        lastOperationId: Date.now()
    });
    els.chatContainer.innerHTML = '';
    loadSavedChats();
    if (window.innerWidth <= 768) els.sideBar.classList.remove('open');
};

window.openSettings = () => {
    els.settingsModal.classList.add('active');
    // Store current values as original when opening settings
    const currentSettings = {
        systemPrompt: els.systemPrompt.value,
        modelId: els.modelSelect.value,
        autoScroll: els.autoScroll.checked,
        tokenRotation: els.tokenRotation.checked,
        enableWebSearch: els.enableWebSearch ? els.enableWebSearch.checked : false
    };
    setState({ originalSettings: currentSettings });
};

window.closeSettings = () => {
    // Check if settings have been changed
    if (hasSettingsChanged()) {
        // Show confirmation dialog
        els.settingsConfirmModal.classList.add('active');
    } else {
        // No changes, just close
        els.settingsModal.classList.remove('active');
    }
};

window.cancelCloseSettings = () => {
    // User wants to keep editing, just close the confirmation dialog
    els.settingsConfirmModal.classList.remove('active');
};

window.discardChangesAndClose = async () => {
    // User wants to discard changes, reset to original values and close both modals
    resetSettingsToOriginal();
    // Also clear IndexedDB settings to ensure changes are not persisted
    const currentState = getState();
    await db.settings.put({ key: 'system_prompt', value: currentState.originalSettings.systemPrompt });
    await db.settings.put({ key: 'model', value: currentState.originalSettings.modelId });
    await db.settings.put({ key: 'auto_scroll', value: currentState.originalSettings.autoScroll });
    await db.settings.put({ key: 'token_rotation', value: currentState.originalSettings.tokenRotation });
    await db.settings.put({ key: 'enable_web_search', value: currentState.originalSettings.enableWebSearch });
    els.settingsModal.classList.remove('active');
    els.settingsConfirmModal.classList.remove('active');
    showToast("Changes discarded");
};

window.saveSettings = async () => {
    // Token management is now handled by tokenManager, no single token to save
    const configUpdates = {
        autoScroll: els.autoScroll.checked,
        systemPrompt: els.systemPrompt.value,
        modelId: els.modelSelect.value,
        enableWebSearch: els.enableWebSearch ? els.enableWebSearch.checked : false
    };
    
    setState((state) => ({
        config: { ...state.config, ...configUpdates }
    }));
    
    await db.settings.put({ key: 'system_prompt', value: configUpdates.systemPrompt });
    await db.settings.put({ key: 'model', value: configUpdates.modelId });
    await db.settings.put({ key: 'auto_scroll', value: configUpdates.autoScroll });
    await db.settings.put({ key: 'enable_web_search', value: configUpdates.enableWebSearch });
  
    // Close both modals if confirmation is open
    els.settingsModal.classList.remove('active');
    els.settingsConfirmModal.classList.remove('active');
    showToast("Settings saved");
};
