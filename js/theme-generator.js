import { state, els } from './state.js';
import { showToast } from './ui.js';
import { themeDefinitions } from './store.js';

// Custom themes storage
let customThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');

// Theme generator functions
window.openThemeGenerator = () => {
    els.themeGeneratorModal.classList.add('active');
    loadThemeModels();
    els.themePrompt.value = '';
    els.generateJavaScript.checked = false;
};

window.closeThemeGenerator = () => {
    els.themeGeneratorModal.classList.remove('active');
};

window.refreshThemeModels = async () => {
    await loadThemeModels();
};

// Load models for theme generation
async function loadThemeModels() {
    try {
        // Use the same populateModelSelect function that works for the main model dropdown
        const { populateModelSelect } = await import('./models.js');
        
        // Clear cached models to force API call
        const { db } = await import('./indexeddb-storage.js');
        await db.settings.delete('cached_models');
        
        // Load fresh models from API
        const { loadModels } = await import('./models.js');
        await loadModels();
        
        // Use the same populate function but target theme dropdown
        const models = state.models;
        els.themeModelSelect.innerHTML = '';
        let found = false;
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name || m.id;
            els.themeModelSelect.appendChild(opt);
        });
        
    } catch (error) {
        console.error('Failed to load theme models:', error);
        showToast('Failed to load AI models for theme generation', 'error');
    }
}

// Filter theme models
window.filterThemeModels = () => {
    const searchTerm = els.themeModelSearch.value.toLowerCase();
    const freeOnly = els.themeFreeOnly.checked;
    
    Array.from(els.themeModelSelect.options).forEach(option => {
        const modelId = option.value;
        const model = state.models.find(m => m.id === modelId);
        const matchesSearch = option.textContent.toLowerCase().includes(searchTerm);
        const isFree = model?.costInfo?.isFree || option.textContent.includes('(Free)');
        const shouldShow = matchesSearch && (!freeOnly || isFree);
        
        option.style.display = shouldShow ? 'block' : 'none';
    });
};

/**
 * Safely parse a JSON string that may contain:
 * - Markdown code fences (```json ... ```)
 * - Unescaped control characters (literal newlines/tabs inside string values)
 * - Extra text before/after the JSON object
 */
function safelyParseThemeJson(text) {
    if (!text) return null;
    
    // Step 1: Strip markdown code fences (```json ... ``` or ``` ... ```)
    let cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
    
    // Step 2: Extract JSON object via balanced braces (handles nested objects)
    // Find the first '{' and match its closing '}'
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace === -1) return null;
    
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let endIdx = -1;
    
    for (let i = firstBrace; i < cleaned.length; i++) {
        const char = cleaned[i];
        
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        
        if (inString) {
            if (char === '\\') {
                escapeNext = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }
        
        if (char === '"') {
            inString = true;
            continue;
        }
        
        if (char === '{') {
            depth++;
        } else if (char === '}') {
            depth--;
            if (depth === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }
    
    if (endIdx === -1) return null;
    
    let jsonStr = cleaned.substring(firstBrace, endIdx);
    
    // Step 3: Sanitize unescaped control characters within string values
    // First, find all string values and fix literal newlines/tabs inside them
    jsonStr = sanitizeJsonStringValues(jsonStr);
    
    // Step 4: Try to parse
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        // If still failing, try a more aggressive approach:
        // Replace all literal newlines with \n, tabs with \t, etc.
        jsonStr = jsonStr
            .replace(/\r\n/g, '\\n')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t');
        
        try {
            return JSON.parse(jsonStr);
        } catch (e2) {
            // Last resort: try to manually construct a minimal valid theme
            // from whatever partial JSON we can salvage
            return salvageThemeJson(jsonStr);
        }
    }
}

/**
 * Sanitizes unescaped control characters (newlines, tabs) within JSON string values.
 * This handles the case where the AI writes multi-line CSS values like gradients
 * with literal line breaks inside them.
 */
function sanitizeJsonStringValues(str) {
    let result = '';
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        
        if (escapeNext) {
            result += char;
            escapeNext = false;
            continue;
        }
        
        if (inString) {
            if (char === '\\') {
                escapeNext = true;
                result += char;
            } else if (char === '"') {
                inString = false;
                result += char;
            } else if (char === '\n' || char === '\r') {
                // Replace literal newlines inside strings with \n escape sequence
                result += '\\n';
            } else if (char === '\t') {
                result += '\\t';
            } else {
                result += char;
            }
        } else {
            result += char;
            if (char === '"') {
                inString = true;
            }
        }
    }
    
    return result;
}

/**
 * Last resort: try to salvage a usable theme from broken JSON.
 * Extracts any key-value pairs that can be parsed.
 */
function salvageThemeJson(str) {
    try {
        // Try to extract name
        const nameMatch = str.match(/"name"\s*:\s*"([^"]*)"/);
        const descMatch = str.match(/"description"\s*:\s*"([^"]*)"/);
        
        if (!nameMatch) return null;
        
        // Try to extract any CSS variables we can find
        const cssVars = {};
        const varRegex = /"(--[\w-]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        let match;
        while ((match = varRegex.exec(str)) !== null) {
            cssVars[match[1]] = match[2];
        }
        
        if (Object.keys(cssVars).length === 0) return null;
        
        return {
            name: nameMatch[1],
            description: descMatch ? descMatch[1] : 'Salvaged custom theme',
            cssVars: cssVars
        };
    } catch (e) {
        return null;
    }
}

// Generate custom theme
window.generateCustomTheme = async () => {
    const prompt = els.themePrompt.value.trim();
    const generateJS = els.generateJavaScript.checked;
    const selectedModel = els.themeModelSelect.value;
    
    if (!prompt) {
        showToast('Please describe your desired theme', 'error');
        return;
    }
    
    if (!selectedModel) {
        showToast('Please select an AI model', 'error');
        return;
    }
    
    // Show loading state
    const generateBtn = event.target;
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:16px">hourglass_empty</span> Generating...';
    generateBtn.disabled = true;
    
    try {
        // Get current themes for context
        const currentThemes = JSON.stringify(themeDefinitions, null, 2);
        
        // Get UI structure for context
        const uiStructure = {
            layout: {
                sidebar: "Left sidebar with navigation, saved chats, settings button",
                main: "Main chat area with messages container and input area at bottom",
                modals: "Settings modal, theme generator modal, confirmation modals"
            },
            elements: {
                buttons: ["Primary buttons", "Secondary buttons", "Icon buttons", "Danger buttons"],
                messages: ["User messages", "AI messages", "Message avatars", "Message content"],
                inputs: ["Text input area", "File inputs", "Select dropdowns", "Checkboxes"],
                interactive: ["Hover states", "Focus states", "Loading states", "Tooltips"]
            },
            components: {
                chat: "Message bubbles, typing indicators, scroll areas, image previews",
                sidebar: "Chat list, new chat button, search toggle, settings access",
                modals: "Overlay backgrounds, modal containers, form elements, action buttons"
            }
        };
        
        // Get CSS files for additional context
        const cssFiles = [
            "base.css - Basic body styles and reset",
            "sidebar.css - Sidebar layout and navigation styles", 
            "chat.css - Message bubbles and chat container styles",
            "input.css - Message input area and button styles",
            "modal.css - Modal overlay and container styles",
            "animations.css - Transitions and keyframe animations",
            "ui-elements.css - Buttons, forms, and interactive elements",
            "responsive.css - Mobile and responsive design styles"
        ];
        
        // Read actual CSS file contents for better context with IndexedDB caching and retry logic
        const cssContents = {};
        const CACHE_KEY = 'css_contents_cache';
        const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
        
        try {
            // Import IndexedDB
            const { db } = await import('./indexeddb-storage.js');
            
            // Try to load from IndexedDB cache first
            const cached = await db.settings.get(CACHE_KEY);
            if (cached && cached.value) {
                const { data, timestamp } = cached.value;
                if (Date.now() - timestamp < CACHE_DURATION) {
                    Object.assign(cssContents, data);
                    console.log('Loaded CSS contents from IndexedDB cache');
                }
            }
            
            // Fetch CSS files with exponential backoff if cache is empty/expired
            if (Object.keys(cssContents).length === 0) {
                const cssFileNames = ['base', 'sidebar', 'chat', 'input', 'modal', 'animations', 'ui-elements', 'responsive'];
                
                for (const fileName of cssFileNames) {
                    let attempts = 0;
                    const maxAttempts = 3;
                    let delay = 1000; // Start with 1 second
                    
                    while (attempts < maxAttempts) {
                        try {
                            const response = await fetch(`css/${fileName}.css`, {
                                cache: 'no-cache', // Ensure fresh content
                                headers: {
                                    'Cache-Control': 'no-cache'
                                }
                            });
                            
                            if (response.ok) {
                                cssContents[fileName] = await response.text();
                                break; // Success, exit retry loop
                            } else {
                                throw new Error(`HTTP ${response.status}`);
                            }
                        } catch (error) {
                            attempts++;
                            console.warn(`Attempt ${attempts} failed for ${fileName}.css:`, error.message);
                            
                            if (attempts < maxAttempts) {
                                console.log(`Retrying ${fileName}.css in ${delay}ms...`);
                                await new Promise(resolve => setTimeout(resolve, delay));
                                delay *= 2; // Exponential backoff
                            } else {
                                console.error(`Failed to fetch ${fileName}.css after ${maxAttempts} attempts`);
                                // Try to use cached version if available
                                const cachedData = await db.settings.get(CACHE_KEY);
                                if (cachedData && cachedData.value && cachedData.value.data[fileName]) {
                                    cssContents[fileName] = cachedData.value.data[fileName];
                                    console.log(`Using cached version for ${fileName}.css`);
                                }
                            }
                        }
                    }
                }
                
                // Cache the successfully fetched contents in IndexedDB
                if (Object.keys(cssContents).length > 0) {
                    await db.settings.put({
                        key: CACHE_KEY,
                        value: {
                            data: cssContents,
                            timestamp: Date.now()
                        }
                    });
                    console.log('Cached CSS contents in IndexedDB for future use');
                }
            }
        } catch (error) {
            console.error('Failed to read CSS files for context:', error);
            // Try to use any available cache as fallback
            try {
                const { db } = await import('./indexeddb-storage.js');
                const cached = await db.settings.get(CACHE_KEY);
                if (cached && cached.value) {
                    Object.assign(cssContents, cached.value.data);
                    console.log('Using IndexedDB cached CSS contents as fallback');
                }
            } catch (cacheError) {
                console.error('IndexedDB cache fallback also failed:', cacheError);
            }
        }
        
        // Build enhanced system prompt - trimmed for efficiency
        const cssContextStr = Object.entries(cssContents)
            .map(([fileName, content]) => `\n--- ${fileName}.css ---\n${content}`)
            .join('\n');
            
        const systemPrompt = `You are a creative theme generation expert with full access to customize the entire PuterGPT chat application interface.

CONTEXT:
1. CURRENT THEMES: Here are the existing theme definitions for reference:
${currentThemes}

2. UI STRUCTURE: This is the application layout you're styling:
${JSON.stringify(uiStructure, null, 2)}

3. CSS FILES: These are the stylesheets you can influence:
${cssFiles.join('\n')}

4. ACTUAL CSS CONTENTS: Here are the current CSS files for complete context:
${cssContextStr}

CREATIVE FREEDOM & CAPABILITIES:
- You can create ANY visual style - from minimal to highly decorative
- Experiment with gradients, animations, shadows, and modern design trends
- Consider accessibility, contrast, and user experience
- You may suggest additional CSS variables beyond the standard set
- Think about the entire user journey and emotional impact
${generateJS ? `- You can create interactive effects with JavaScript

JAVASCRIPT ENHANCEMENTS:
- Use themeUtils.addClass(selector, className) to add CSS classes
- Use themeUtils.removeClass(selector, className) to remove CSS classes
- Use themeUtils.toggleClass(selector, className) to toggle classes
- Use themeUtils.addAnimation(selector, animation) to add CSS animations
- Use themeUtils.setCSSVar(varName, value) to dynamically set CSS variables
- Use themeUtils.createElement(tag, attributes, text) to create elements
- Use themeUtils.appendTo(selector, element) to add elements to DOM
- Use themeUtils.addEventListener(selector, event, handler) for interactions
- Use themeUtils.storage for persisting theme-specific data
- Access to Math, Date, JSON, localStorage, sessionStorage for advanced effects` : ''}

REQUIREMENTS:
1. Generate a valid JSON object with this structure:
{
  "name": "string (creative theme name with emoji that captures the essence)",
  "description": "string (brief description of the theme's mood and style)",
  "cssVars": {
    // Standard variables (all required)
    "--bg-primary": "string",
    "--bg-secondary": "string", 
    "--bg-sidebar": "string",
    "--text-primary": "string",
    "--text-secondary": "string",
    "--border-color": "string",
    "--input-bg": "string",
    "--user-msg-bg": "string",
    "--ai-msg-bg": "string",
    "--accent": "string",
    "--accent-hover": "string",
    "--danger": "string",
    "--warning": "string",
    "--btn-hover-bg": "string",
    "--btn-hover-border": "string",
    "--btn-primary-hover-bg": "string",
    "--input-focus-border": "string",
    "--hover-overlay": "string",
    "--radius-sm": "string",
    "--radius-md": "string", 
    "--radius-lg": "string",
    "--radius-xl": "string",
    "--font-sans": "string",
    "--shadow-sm": "string",
    "--shadow-md": "string",
    "--user-avatar-bg": "string",
    "--gradient-start": "string",
    "--input-border-radius": "string",
    "--focus-border": "string",
    "--hover-light": "string",
    "--danger-hover": "string",
    "--danger-bg": "string",
    "--danger-border": "string",
    "--modal-overlay": "string",
    "--sidebar-width": "string",
    "--avatar-size": "string",
    "--font-mono": "string",
    "--scrollbar-width": "string",
    "--scrollbar-width-modal": "string",
    "--message-border-radius": "string",
    "--code-bg": "string",
    "--code-border": "string",
    "--pre-bg": "string",
    "--blockquote-bg": "string",
    "--blockquote-border": "string",
    "--link-color": "string",
    "--link-hover": "string",
    "--table-border": "string",
    "--table-header-bg": "string",
    "--table-row-hover": "string",
    "--scrollbar-track": "string",
    "--scrollbar-thumb": "string",
    "--scrollbar-thumb-hover": "string",
    "--selection-bg": "string",
    "--loading-spinner": "string",
    "--typing-indicator": "string",
    "--sidebar-hover": "string",
    "--chat-bg-pattern": "string",
    "--glow-effect": "string",
    "--transition-speed": "string",
    "--animation-easing": "string"
    // Optional creative variables (add if your theme needs them)
    // "--custom-gradient-1": "string",
    // "--custom-animation-speed": "string",
    // "--custom-glow-color": "string",
    // "--custom-pattern-bg": "string"
  }${generateJS ? `,
  "javascript": {
    "onApply": "string (JavaScript code for theme application - can add classes, create animations, modify elements)",
    "onRemove": "string (JavaScript cleanup code - must reverse ALL changes made in onApply)"
  }` : ''}
}

DESIGN PRINCIPLES:
- Create a cohesive visual experience across all components
- Ensure good contrast ratios for readability
- Consider how colors work together in different contexts
- Think about the emotional impact and user comfort
- Be creative but maintain usability
${generateJS ? `- If using JavaScript effects, make them enhance rather than distract` : `- Focus on CSS-only theme enhancements (no JavaScript)`}

CRITICAL RULES:
- Respond with ONLY the JSON object, no other text
- All CSS values must be valid CSS strings (colors, sizes, fonts)
- Theme name should be creative and descriptive with appropriate emoji
${generateJS ? `- If generating JavaScript, ensure proper cleanup in onRemove` : `- Do NOT generate any JavaScript code in your response`}
- Be ambitious - create something unique and memorable!

USER REQUEST: ${prompt}`;

        // Get current token for API call
        const { tokenManager } = await import('./token-manager.js');
        const currentToken = await tokenManager.getCurrentToken();
        const apiToken = await tokenManager.getApiToken();
        
        // Generate theme using Puter API
        const response = await fetch('https://api.puter.com/drivers/call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken || ''}`,
                'Accept': '*/*'
            },
            body: JSON.stringify({
                interface: 'puter-chat-completion',
                driver: 'ai-chat',
                method: 'complete',
                args: {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Generate a theme: ${prompt}` }
                    ],
                    model: selectedModel,
                    stream: false
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to generate theme');
        
        const data = await response.json();
        let themeRaw = data.result?.message?.content;
        
        if (!themeRaw) {
            // Try alternate response structures (different AI models may return differently)
            const altContent = data.result?.content || data.choices?.[0]?.message?.content || data.message?.content;
            if (!altContent) {
                throw new Error('No theme generated - AI response was empty');
            }
            themeRaw = altContent;
        }
        
        // Check if the response was truncated (AI hit its max output limit)
        // finish_reason === 'length' means the model stopped because it ran out of tokens,
        // which often results in cut-off JSON. Inform the user to try a different model.
        const finishReason = data.result?.finish_reason || data.result?.native_finish_reason;
        if (finishReason === 'length') {
            throw new Error('This model ran out of output capacity while generating the theme. Please try switching to a different model with larger output limits.');
        }
        
        // Parse and validate theme using robust parser
        const theme = safelyParseThemeJson(themeRaw);
        
        if (!theme) {
            throw new Error('Invalid JSON response from AI - could not parse theme');
        }
        
        // Validate theme structure
        if (!theme.name || !theme.cssVars) {
            throw new Error('Invalid theme structure - missing name or CSS variables');
        }
        
        // Generate unique ID for custom theme
        const themeId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        
        // Re-read custom themes from localStorage to ensure we have the latest state
        // (in case a theme was deleted since page load)
        const currentCustomThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');
        
        // Store custom theme
        currentCustomThemes[themeId] = theme;
        localStorage.setItem('customThemes', JSON.stringify(currentCustomThemes));
        customThemes = currentCustomThemes;
        
        // Save to IndexedDB for persistence
        const { db } = await import('./indexeddb-storage.js');
        await db.settings.put({ key: 'customThemes', value: currentCustomThemes });
        
        // Add to theme definitions
        themeDefinitions[themeId] = theme;
        
        // Apply to new theme
        import('./state.js').then(m => m.applyTheme(themeId));
        
        // Update dropdown immediately
        const { populateThemeDropdown } = await import('./app.js');
        populateThemeDropdown();
        
        // Set dropdown to new theme
        els.themeSelect.value = themeId;
        
        // Close modal
        closeThemeGenerator();
        
        showToast(`Custom theme "${theme.name}" created and applied!`, 'success');
        
    } catch (error) {
        console.error('Theme generation failed:', error);
        showToast(`Failed to generate theme: ${error.message}`, 'error');
    } finally {
        // Restore button state
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
};

// Load custom themes on startup
export async function loadCustomThemes() {
    try {
        // Use localStorage as the source of truth
        // IndexedDB writes might not always persist on first attempt (race conditions, etc.),
        // so localStorage (which is more reliable for simple key-value storage)
        // is treated as authoritative. IndexedDB is synced to match localStorage.
        const localData = localStorage.getItem('customThemes');
        let localThemes = {};
        if (localData) {
            try {
                localThemes = JSON.parse(localData);
            } catch (e) {
                console.warn('Failed to parse localStorage customThemes, ignoring', e);
            }
        }
        
        // Start with localStorage themes (deleted themes are correctly absent here)
        customThemes = {};
        Object.entries(localThemes).forEach(([id, theme]) => {
            customThemes[id] = theme;
        });
        
        // Load themes into definitions
        Object.entries(customThemes).forEach(([id, theme]) => {
            themeDefinitions[id] = theme;
        });
        
        // Sync IndexedDB to match localStorage
        const { db } = await import('./indexeddb-storage.js');
        localStorage.setItem('customThemes', JSON.stringify(customThemes));
        await db.settings.put({ key: 'customThemes', value: customThemes }).catch(err => {
            console.warn('Failed to sync custom themes to IndexedDB:', err);
        });
        
    } catch (error) {
        console.error('Failed to load custom themes:', error);
        // Fallback to localStorage
        customThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');
        Object.entries(customThemes).forEach(([id, theme]) => {
            themeDefinitions[id] = theme;
        });
    }
}

// Handle theme select change for custom option
export function handleThemeSelectChange(e) {
    if (e.target.value === 'generate-custom') {
        openThemeGenerator();
        // Reset to previous theme
        e.target.value = window.currentTheme || 'dark';
    }
}