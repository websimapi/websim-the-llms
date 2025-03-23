// LLM data manager for storing and retrieving LLM data
export const llmDataManager = {
    // Array to store all LLMs in memory
    llms: [],
    
    // Save a new LLM
    saveLLM(llmData) {
        // Generate a unique ID if not present
        if (!llmData.id) {
            llmData.id = Date.now().toString();
        }
        
        // Add timestamp
        llmData.createdAt = new Date().toISOString();
        
        // Add to in-memory array
        this.llms.push(llmData);
        
        // Save to localStorage
        this.saveToLocalStorage();
        
        return llmData.id;
    },
    
    // Get all LLMs
    getAllLLMs() {
        return [...this.llms];
    },
    
    // Get a specific LLM by ID
    getLLMById(id) {
        return this.llms.find(llm => llm.id === id);
    },
    
    // Delete an LLM by ID
    deleteLLM(id) {
        const index = this.llms.findIndex(llm => llm.id === id);
        if (index !== -1) {
            this.llms.splice(index, 1);
            this.saveToLocalStorage();
            return true;
        }
        return false;
    },
    
    // Save all LLMs to localStorage
    saveToLocalStorage() {
        localStorage.setItem('llmsData', JSON.stringify(this.llms));
    },
    
    // Load LLMs from localStorage
    loadFromLocalStorage() {
        const data = localStorage.getItem('llmsData');
        if (data) {
            try {
                this.llms = JSON.parse(data);
            } catch (error) {
                console.error('Error loading LLMs from localStorage:', error);
                this.llms = [];
            }
        }
    },
    
    // Initialize the manager
    initialize() {
        this.loadFromLocalStorage();
    }
};