import { streamPuterCompletion } from 'https://codegen-new.on.websim.com/?v=570/puterStream.js'; // Imported from my project "AI Code Generator"
import { state } from './state.js';
import { scrollToBottom, showToast } from './ui.js';
import { saveChatToStorage } from './storage.js';
import { tokenManager } from './token-manager.js';
import { renderMessage, reRenderAllMessages, decorateCodeBlocks } from './chat-ui.js';
import { setState } from './store.js';
import { estimateTokens, calculateMessageCost } from './models.js';

// Global operation lock to prevent concurrent API calls
let isOperationInProgress = false;

export async function triggerAssistantResponse() {
    // Prevent concurrent operations
    if (isOperationInProgress) {
        console.warn('Assistant response already in progress, ignoring duplicate request');
        return;
    }

    isOperationInProgress = true;

    // Declare variables outside try block for catch block access
    let aiMsgIndex, aiMsgId, aiMsgEl, contentEl;
    let fullContent = "";
    let reasoningBlock = null;
    let contentWrapper = null;
    let fullReasoning = "";
    let toolUseBlock = null;

    try {
        const lastUserMessage = state.messages.filter(m => m.role === 'user').pop();
        const hasImagesForApi = lastUserMessage && lastUserMessage.images && lastUserMessage.images.length > 0;

        const currentModel = state.models.find(m => m.id === state.config.modelId);
        const modelSupportsVision = currentModel && currentModel.supportsVision;
        const enableVision = hasImagesForApi && modelSupportsVision;
        
        const modelSupportsSearch = currentModel && currentModel.supportsSearch;
        const enableWebSearch = modelSupportsSearch && state.config.enableWebSearch;

        const messagesPayload = [
            { role: 'system', content: state.config.systemPrompt },
            ...state.messages
        ];

        // Calculate input tokens (rough estimate)
        const inputText = messagesPayload.map(m => m.content).join(' ');
        const inputTokens = estimateTokens(inputText);

        setState((state) => ({
            messages: [...state.messages, { role: 'assistant', content: '' }]
        }));

        // Get the correct index after state update
        aiMsgIndex = state.messages.length - 1;
        aiMsgId = renderMessage(aiMsgIndex, { role: 'assistant', content: '' }, true);
        aiMsgEl = document.getElementById(aiMsgId);
        contentEl = aiMsgEl.querySelector('.message-content');

        const currentToken = await tokenManager.getCurrentToken();
        const apiToken = await tokenManager.getApiToken();
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiToken || ''}`,
          'Accept': '*/*'
        };

        const operationId = Date.now();
        const abortController = new AbortController();
        setState({ 
            lastOperationId: operationId,
            abortController: abortController 
        });

        await streamPuterCompletion({
            apiUrl: "https://api.puter.com/drivers/call",
            requestBody: {
                "interface": "puter-chat-completion",   
                "driver": "ai-chat",
                "test_mode": true,
                "method": "complete",
                "args": {
                    vision: enableVision,
                    messages: messagesPayload,
                    model: state.config.modelId,
                    stream: true,
                    ...(enableWebSearch && { tools: [{ type: 'web_search' }] })
                }
            },
            headers,
            signal: abortController.signal,
            onToolUse: (toolUse) => {
                if (state.lastOperationId !== operationId) return;
                // Display tool use information in the UI
                if (!toolUseBlock) {
                    toolUseBlock = document.createElement('div');
                    toolUseBlock.className = 'tool-use-block';
                    toolUseBlock.innerHTML = `<div class="tool-use-header"><span class="material-icons-outlined" style="font-size:16px">search</span> <span>Using Web Search</span></div><div class="tool-use-content"></div>`;
                    contentEl.prepend(toolUseBlock);
                }
                const toolContent = toolUseBlock.querySelector('.tool-use-content');
                if (toolUse.name === 'web_search' && toolUse.input) {
                    toolContent.textContent = `Searching for: ${JSON.stringify(toolUse.input)}`;
                } else {
                    toolContent.textContent = `Tool: ${toolUse.name} - ${JSON.stringify(toolUse.input)}`;
                }
            },
            onPartialUpdate: (update) => {
                 if (state.lastOperationId !== operationId) return;
                 const typing = contentEl.querySelector('.typing-indicator');
                 if (typing) typing.remove();

                 const reasoningText = update.accumulatedReasoning || "";
                 if (reasoningText.trim().length > 0) {
                     fullReasoning = reasoningText;
                     if (!reasoningBlock) {
                         reasoningBlock = document.createElement('div');
                         reasoningBlock.className = 'reasoning-block';
                         reasoningBlock.innerHTML = `<div class="reasoning-header"><span>Thinking Process</span> <span class="material-icons-outlined" style="font-size:16px">expand_less</span></div><div class="reasoning-content open"></div>`;
                         const rContent = reasoningBlock.querySelector('.reasoning-content');
                         const rHeader = reasoningBlock.querySelector('.reasoning-header');
                         rHeader.onclick = () => {
                             rContent.classList.toggle('open');
                             rHeader.querySelector('.material-icons-outlined').textContent = rContent.classList.contains('open') ? 'expand_less' : 'expand_more';
                         };
                         contentEl.prepend(reasoningBlock);
                     }
                     reasoningBlock.querySelector('.reasoning-content').textContent = reasoningText;
                 }

                 if (update.accumulatedContent !== undefined) {
                     fullContent = update.accumulatedContent;
                     if (!contentWrapper) {
                         contentWrapper = document.createElement('div');
                         contentWrapper.className = 'assistant-response';
                         contentEl.appendChild(contentWrapper);
                     }
                     contentWrapper.innerHTML = marked.parse(fullContent);
                     contentWrapper.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
                     decorateCodeBlocks(contentWrapper);
                 }
                 scrollToBottom();
            },
            onComplete: (final) => {
                 if (state.lastOperationId !== operationId) return;
                 const typing = contentEl.querySelector('.typing-indicator');
                 if (typing) typing.remove();
                 
                 const finalContent = final.accumulatedContent || fullContent;
                 const finalReasoning = final.accumulatedReasoning || fullReasoning;
                 
                 state.messages[aiMsgIndex].content = finalContent;
                 state.messages[aiMsgIndex].reasoning = finalReasoning;
                 
                 // Calculate output tokens and cost
                 const outputTokens = estimateTokens(finalContent);
                 const costInfo = calculateMessageCost(inputTokens, outputTokens, currentModel?.costInfo);
                 
                 // Add cost information to the message
                 state.messages[aiMsgIndex].cost = costInfo;
                 
                 reRenderAllMessages();
                 saveChatToStorage();
                 
                 // Clear operation state
                 setState({ 
                     lastOperationId: null,
                     abortController: null 
                 });
                 
                 if (currentToken && (currentToken.value || currentToken.token)) {
                     tokenManager.markTokenSuccess(currentToken.value || currentToken.token);
                 }
            },
            onError: (err) => {
                 if (state.lastOperationId !== operationId) return;
                 const typing = contentEl.querySelector('.typing-indicator');
                 if (typing) typing.remove();
                 
                 // Don't show error for intentional aborts
                 if (err.name === 'AbortError') {
                     // Save partial content before cleaning up
                     if (fullContent || fullReasoning) {
                         // If there's reasoning but no content, add placeholder
                         const finalContent = fullContent || (fullReasoning ? '[Response not generated]' : '');
                         state.messages[aiMsgIndex].content = finalContent;
                         state.messages[aiMsgIndex].reasoning = fullReasoning;
                         reRenderAllMessages();
                         saveChatToStorage();
                     } else {
                         // Only remove empty assistant message if there's no reasoning content
                         state.messages.splice(aiMsgIndex, 1);
                         reRenderAllMessages();
                     }
                 } else {
                     contentEl.innerHTML += `<p style="color:var(--danger)">Error: ${err.message}</p>`;
                     
                     // Safely remove the empty assistant message at the expected index
                     if (state.messages[aiMsgIndex] && state.messages[aiMsgIndex].role === 'assistant' && state.messages[aiMsgIndex].content === '') {
                         state.messages.splice(aiMsgIndex, 1);
                     } else {
                         // Fallback: remove the last message if it's an empty assistant message
                         const lastMsg = state.messages[state.messages.length - 1];
                         if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === '') {
                             state.messages.pop();
                         }
                     }
                     
                     if (currentToken && (currentToken.value || currentToken.token)) {
                         tokenManager.markTokenFailed(currentToken.value || currentToken.token);
                         showToast(`Token "${currentToken.name}" failed. ${tokenManager.rotationEnabled ? 'Rotating to next token.' : 'Please check token or enable rotation.'}`, 'error');
                     }
                 }
                 
                 // Clear operation state
                 setState({ 
                     lastOperationId: null,
                     abortController: null 
                 });
            }
        });
    } catch (err) {
        // Don't show error for intentional aborts
        if (err.name === 'AbortError') {
            // Save partial content before cleaning up
            if (contentEl && (fullContent || fullReasoning)) {
                // If there's reasoning but no content, add placeholder
                const finalContent = fullContent || (fullReasoning ? '[Response not generated]' : '');
                state.messages[aiMsgIndex].content = finalContent;
                state.messages[aiMsgIndex].reasoning = fullReasoning;
                reRenderAllMessages();
                saveChatToStorage();
            } else {
                // Only remove empty assistant message if there's no reasoning content
                state.messages.splice(aiMsgIndex, 1);
                reRenderAllMessages();
            }
            
            // Clear operation state for abort
            setState({ 
                lastOperationId: null,
                abortController: null 
            });
        } else {
            // Only try to update DOM if elements were created
            if (contentEl) {
                const typing = contentEl.querySelector('.typing-indicator');
                if (typing) typing.remove();
                contentEl.innerHTML = `<p style="color:var(--danger)">Stream Failed: ${err.message}</p>`;
            }
            
            // Safely remove the empty assistant message at the expected index
            if (aiMsgIndex !== undefined && state.messages[aiMsgIndex] && state.messages[aiMsgIndex].role === 'assistant' && state.messages[aiMsgIndex].content === '') {
                state.messages.splice(aiMsgIndex, 1);
            } else {
                // Fallback: remove the last message if it's an empty assistant message
                const lastMsg = state.messages[state.messages.length - 1];
                if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === '') {
                    state.messages.pop();
                }
            }
        }
    } finally {
        // Always clear the operation lock and abort controller
        isOperationInProgress = false;
        if (state.abortController) {
            setState({ abortController: null });
        }
    }
}

export function abortAssistantResponse() {
    if (state.lastOperationId && state.abortController) {
        // Abort the current stream
        state.abortController.abort();
        
        // Clear operation state immediately
        setState({ 
            lastOperationId: null,
            abortController: null 
        });
        
        // Show feedback to user
        showToast('Response generation stopped', 'info');
    }
}
