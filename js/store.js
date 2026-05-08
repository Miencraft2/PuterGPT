const createStoreImpl = (createState) => {
  let state;
  const listeners = new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const api = { setState, getState, getInitialState, subscribe };
  const initialState = state = createState(setState, getState, api);
  return api;
};
const createStore = ((createState) => createState ? createStoreImpl(createState) : createStoreImpl);
const applyMiddleware = (...middlewares) => (createState) => {
  const enhancedCreateState = middlewares.reduceRight((acc, middleware) => middleware(acc), createState);
  return createStoreImpl(enhancedCreateState);
};

// Create the main application store
export const useAppStore = createStore((set, get) => ({
  // Chat state
  messages: [],
  currentChatId: null,
  attachedImages: [], // Array of { file, dataUrl, name } objects
  
  // Models state
  models: [],
  
  // Configuration state
  config: {
    systemPrompt: 'You are a helpful assistant.', // Default fallback
    modelId: 'openrouter:stepfun/step-3.5-flash:free', // Default fallback
    autoScroll: true, // Default fallback
    tokenRotation: false, // Default fallback
    enableWebSearch: false // Default fallback
  },
  
  // Track original settings for comparison
  originalSettings: {
    systemPrompt: 'You are a helpful assistant.',
    modelId: 'openrouter:stepfun/step-3.5-flash:free',
    autoScroll: true,
    tokenRotation: false,
    enableWebSearch: false
  },
  
  // Operation tracking
  lastOperationId: null,
  abortController: null,
  
  // Actions for updating state
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  
  setCurrentChatId: (currentChatId) => set({ currentChatId }),
  
  setAttachedImages: (attachedImages) => set({ attachedImages }),
  addAttachedImage: (image) => set((state) => ({ 
    attachedImages: [...state.attachedImages, image] 
  })),
  clearAttachedImages: () => set({ attachedImages: [] }),
  
  setModels: (models) => set({ models }),
  
  updateConfig: (configUpdates) => set((state) => ({ 
    config: { ...state.config, ...configUpdates } 
  })),
  
  updateOriginalSettings: (settings) => set({ originalSettings: settings }),
  
  // Reset chat state for new chat
  newChat: () => set({ 
    currentChatId: null, 
    messages: [], 
    attachedImages: [] 
  }),
  
  // Load chat data
  loadChat: (chatData) => set({
    currentChatId: chatData.id,
    messages: chatData.messages,
    attachedImages: []
  })
}));

// Export store instance for direct access
export const appStore = useAppStore;

// Export convenience functions
export const getState = () => appStore.getState();
export const setState = (updates) => appStore.setState(updates);
export const subscribe = (listener) => appStore.subscribe(listener);
