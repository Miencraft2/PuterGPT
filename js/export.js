import { generateUniqueId } from './utils.js';
import { showToast } from './ui.js';
import { generateShareUrl } from './compression.js';
import { db } from './indexeddb-storage.js';
import { setState } from './store.js';

// Export utilities for conversations

export async function exportChatAsJson(chatId) {
    try {
        const chat = await db.chats.get(chatId);

        if (!chat) {
            showToast('Chat not found');
            return;
        }

        // Prepare export data with metadata
        const exportData = {
            title: chat.title,
            id: chat.id,
            exportedAt: new Date().toISOString(),
            lastModified: new Date(chat.lastModified).toISOString(),
            messageCount: chat.messages.length,
            messages: chat.messages
        };

        // Create and download JSON file
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${chat.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Chat exported successfully');
    } catch (error) {
        console.error('Failed to export chat:', error);
        showToast('Failed to export chat');
    }
}

export async function shareChat(chatId) {
    try {
        const chat = await db.chats.get(chatId);

        if (!chat) {
            showToast('Chat not found');
            return;
        }

        // Generate share URL
        const shareUrl = generateShareUrl({
            title: chat.title,
            messages: chat.messages,
            sharedAt: new Date().toISOString()
        });

        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl);
            showToast('Share link copied to clipboard');
        } else {
            // Fallback for browsers without clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                showToast('Share link copied to clipboard');
            } catch (error) {
                console.error('Failed to copy share link:', error);
                showToast('Failed to copy share link. URL: ' + shareUrl);
            } finally {
                document.body.removeChild(textArea);
            }
        }
    } catch (error) {
        console.error('Failed to share chat:', error);
        showToast('Failed to generate share link');
    }
}

export function loadSharedChat() {
    try {
        // Import compression utilities dynamically to avoid circular imports
        import('./compression.js').then(({ parseSharedUrl }) => {
            const sharedData = parseSharedUrl();

            if (sharedData && sharedData.messages) {
                // Import chat modules
                import('./chat-ui.js').then(({ reRenderAllMessages }) => {
                    import('./storage.js').then(({ loadSavedChats }) => {
                        import('./indexeddb-storage.js').then(({ db }) => {
                            // Generate a new chat ID for the shared chat
                            const newChatId = generateUniqueId();

                            // Set up the shared chat data
                            const chatData = {
                                id: newChatId,
                                title: sharedData.title || 'Shared Chat',
                                messages: sharedData.messages,
                                lastModified: Date.now(),
                                sharedAt: sharedData.sharedAt,
                                importedAt: new Date().toISOString()
                            };

                            // Update current state
                            setState({
                                currentChatId: newChatId,
                                messages: sharedData.messages
                            });

                            // Save to storage
                            db.chats.put(chatData).then(() => {
                                // Re-render messages
                                reRenderAllMessages();

                                // Refresh saved chats list
                                loadSavedChats();

                                showToast(`Loaded and saved shared chat: ${chatData.title} (${sharedData.messages.length} messages)`);

                                // Clear the URL hash after loading
                                window.history.replaceState(null, null, window.location.pathname);
                            });
                        });
                    });
                });
            }
        });
    } catch (error) {
        console.error('Failed to load shared chat:', error);
        showToast('Failed to load shared conversation');
    }
}

export function importChatFromJson(jsonData) {
    try {
        // Validate the imported data structure
        if (!jsonData || typeof jsonData !== 'object') {
            throw new Error('Invalid JSON format');
        }

        if (!jsonData.messages || !Array.isArray(jsonData.messages)) {
            throw new Error('Invalid chat format: missing messages array');
        }

        // Import required modules
        import('./state.js').then(({ state }) => {
            import('./chat-ui.js').then(({ reRenderAllMessages }) => {
                import('./storage.js').then(({ loadSavedChats }) => {
                    import('./indexeddb-storage.js').then(({ db }) => {
                        // Generate a new chat ID for the imported chat
                        const newChatId = generateUniqueId();

                        // Set up the imported chat data
                        const chatData = {
                            id: newChatId,
                            title: jsonData.title || 'Imported Chat',
                            messages: jsonData.messages,
                            lastModified: Date.now(),
                            importedAt: new Date().toISOString(),
                            originalExportedAt: jsonData.exportedAt
                        };

                        // Update current state
                        setState({
                            currentChatId: newChatId,
                            messages: jsonData.messages
                        });

                        // Save to storage
                        db.chats.put(chatData).then(() => {
                            // Re-render messages
                            reRenderAllMessages();

                            // Refresh saved chats list
                            loadSavedChats();

                            showToast(`Imported and saved chat: ${chatData.title} (${jsonData.messageCount || jsonData.messages.length} messages)`);
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Failed to import chat:', error);
        showToast(`Failed to import chat: ${error.message}`);
    }
}
