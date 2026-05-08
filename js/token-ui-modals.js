// Token UI - Guide & Import/Export Modals
import { tokenManager, TOKEN_GUIDE } from './token-manager.js';
import { renderTokenList } from './token-ui-list.js';
import { showToast } from './ui.js';

export function showTokenGuide() {
    try {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal token-guide-modal">
                <h3>Token Guide</h3>
                <div class="token-guide-content">
                    <pre style="white-space: pre-wrap; font-size:0.9rem; line-height:1.4;">${TOKEN_GUIDE}</pre>
                </div>
                <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
                    <button class="btn" id="guide-close-btn">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add active class to make modal visible
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        // Add close button functionality
        const closeBtn = modal.querySelector('#guide-close-btn');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Also close with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
    } catch (error) {
        console.error('Error in showTokenGuide:', error);
        alert('Error showing token guide: ' + error.message);
    }
}

export function importTokens() {
    // Create import modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h3>Import Tokens</h3>
            <p style="margin-bottom: 15px;">Paste exported token JSON you copied previously into the box below. This will add them to your current list.</p>
            <textarea id="import-token-json" placeholder='[{"tokenName": "...", "value": "...", "disabled": false}, ...]' style="height: 150px; font-family: monospace; font-size: 12px; margin-bottom: 15px; width: 100%; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-secondary); color: var(--text-primary); padding: 8px; resize: vertical;"></textarea>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button class="btn" id="cancel-import-btn" style="background-color: var(--danger);">Cancel</button>
                <button class="btn primary" id="confirm-import-btn" style="background-color: var(--accent);">Import Tokens</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Add active class to make modal visible
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    // Add button functionality
    const cancelBtn = modal.querySelector('#cancel-import-btn');
    const confirmBtn = modal.querySelector('#confirm-import-btn');
    const textArea = modal.querySelector('#import-token-json');
    
    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    confirmBtn.addEventListener('click', async () => {
        const jsonText = textArea.value.trim();
        if (!jsonText) {
            showToast('Please enter token JSON data', 'error');
            return;
        }
        
        try {
            const importedCount = await tokenManager.importTokens(jsonText);
            await renderTokenList();
            showToast(`Successfully imported ${importedCount} tokens`, 'success');
            modal.remove();
        } catch (error) {
            showToast(`Import failed: ${error.message}`, 'error');
        }
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Also close with Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Focus on textarea
    setTimeout(() => {
        textArea.focus();
    }, 100);
}

export async function exportTokens() {
    try {
        const tokens = await tokenManager.exportTokens();
        const dataStr = JSON.stringify(tokens, null, 2);
        
        // Create confirmation modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <h3 style="color: var(--warning); margin-bottom: 15px;">
                    <i class="material-icons-outlined" style="vertical-align: middle; margin-right: 8px;">warning</i>
                    Security Warning
                </h3>
                <p style="margin-bottom: 15px;">You are about to copy your API tokens to your clipboard. Tokens grant access to your AI models and credits.</p>
                <p style="margin-bottom: 20px;"><strong>Never share these tokens</strong> with anyone you don't trust. Ensure you are in a private environment before proceeding.</p>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    <button class="btn" id="cancel-export-btn" style="background-color: var(--danger);">Cancel</button>
                    <button class="btn primary" id="confirm-export-btn" style="background-color: var(--accent);">I Understand, Copy Now</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add active class to make modal visible
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        // Add button functionality
        const cancelBtn = modal.querySelector('#cancel-export-btn');
        const confirmBtn = modal.querySelector('#confirm-export-btn');
        
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        confirmBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(dataStr);
                showToast(`Copied ${tokens.length} tokens to clipboard`, 'success');
                modal.remove();
            } catch (error) {
                // Fallback to creating downloadable file if clipboard fails
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `puter-tokens-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                showToast(`Downloaded ${tokens.length} tokens`, 'success');
                modal.remove();
            }
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Also close with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
    } catch (error) {
        showToast(`Export failed: ${error.message}`, 'error');
    }
}