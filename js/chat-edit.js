import { state } from './state.js';
import { saveChatToStorage } from './storage.js';
import { showToast } from './ui.js';
import { getMessageText, reRenderAllMessages } from './chat-ui.js';
import { triggerAssistantResponse } from './chat-api.js';
import { setState } from './store.js';

window.enterEditMode = function(index) {
    const message = state.messages[index];
    const msgEl = document.querySelector(`.message[data-index='${index}']`);
    if (!msgEl) return;

    const contentEl = msgEl.querySelector('.message-content');
    const renderedContent = contentEl.querySelector('.rendered-content');
    const actions = msgEl.querySelector('.avatar-actions');
    
    renderedContent.style.display = 'none';
    if (actions) {
        actions.style.display = 'none';
    }

    const editUI = document.createElement('div');
    editUI.className = 'edit-container';
    
    let buttonsHtml = `
        <button class="btn danger" onclick="cancelEdit(${index})">Cancel</button>
        <button class="btn primary" onclick="saveEdit(${index})">Save</button>
    `;
    
    if (message.role === 'user') {
        buttonsHtml += `
            <button class="btn primary" onclick="saveAndRegenerate(${index})">Save + Regenerate</button>
        `;
    }

    editUI.innerHTML = `
        <textarea class="edit-textarea" id="edit-textarea-${index}">${getMessageText(message)}</textarea>
        <div class="edit-controls">
            ${buttonsHtml}
        </div>
    `;

    contentEl.appendChild(editUI);
    const textarea = editUI.querySelector('textarea');
    textarea.focus();
    textarea.selectionStart = textarea.value.length;
};

window.cancelEdit = function(index) {
    reRenderAllMessages();
};

window.saveEdit = function(index) {
    const textarea = document.getElementById(`edit-textarea-${index}`);
    if (!textarea) return;
    const newContent = textarea.value;
    
    setState((state) => {
        const newMessages = [...state.messages];
        newMessages[index] = { ...newMessages[index], content: newContent };
        return { messages: newMessages };
    });
    
    reRenderAllMessages();
    saveChatToStorage();
    showToast("Message updated");
};

window.saveAndRegenerate = async function(index) {
    const textarea = document.getElementById(`edit-textarea-${index}`);
    if (!textarea) return;
    const newContent = textarea.value;
    
    setState((state) => {
        const newMessages = [...state.messages];
        newMessages[index] = { ...newMessages[index], content: newContent };
        
        // Truncate messages after this one
        const truncatedMessages = newMessages.slice(0, index + 1);
        return { messages: truncatedMessages };
    });

    reRenderAllMessages();
    saveChatToStorage();
    
    await triggerAssistantResponse();
};
