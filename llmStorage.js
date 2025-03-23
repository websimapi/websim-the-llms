// LLM Storage and Management System
export const llmStorage = {
    // Collection of created LLMs
    llms: [],
    
    // Initialize by loading from localStorage
    initialize() {
        const storedData = localStorage.getItem('llms');
        if (storedData) {
            try {
                this.llms = JSON.parse(storedData);
            } catch (e) {
                console.error('Error loading LLMs from localStorage:', e);
                this.llms = [];
            }
        }
        return this.llms;
    },
    
    // Save LLM to collection and localStorage
    saveLLM(llmData) {
        // Generate a unique ID if not provided
        if (!llmData.id) {
            llmData.id = Date.now().toString(36) + Math.random().toString(36).substring(2);
        }
        
        // Check if LLM already exists (for updates)
        const existingIndex = this.llms.findIndex(llm => llm.id === llmData.id);
        
        if (existingIndex >= 0) {
            // Update existing
            this.llms[existingIndex] = llmData;
        } else {
            // Add new
            this.llms.push(llmData);
        }
        
        // Save to localStorage
        this.saveToLocalStorage();
        
        return llmData;
    },
    
    // Delete LLM by ID
    deleteLLM(id) {
        this.llms = this.llms.filter(llm => llm.id !== id);
        this.saveToLocalStorage();
    },
    
    // Get all LLMs
    getAllLLMs() {
        return this.llms;
    },
    
    // Get LLM by ID
    getLLMById(id) {
        return this.llms.find(llm => llm.id === id);
    },
    
    // Save current llms array to localStorage
    saveToLocalStorage() {
        localStorage.setItem('llms', JSON.stringify(this.llms));
    }
};