// LLM data storage and management
export const llmDataManager = {
    // Array to store all created LLMs
    createdLLMs: [],
    
    // Initialize from localStorage
    init() {
        const storedLLMs = localStorage.getItem('createdLLMs');
        if (storedLLMs) {
            try {
                this.createdLLMs = JSON.parse(storedLLMs);
            } catch (e) {
                console.error('Error loading LLMs from localStorage:', e);
                this.createdLLMs = [];
            }
        }
    },
    
    // Add a new LLM to the collection
    addLLM(llmData) {
        // Add a unique ID and creation timestamp
        llmData.id = Date.now() + Math.random().toString(36).substr(2, 9);
        llmData.createdAt = new Date().toISOString();
        
        // Ensure color is stored in proper hex format
        if (llmData.color && !llmData.color.startsWith('#')) {
            llmData.color = '#' + llmData.color;
        }
        
        // Add to array
        this.createdLLMs.push(llmData);
        
        // Save to localStorage
        this.saveToLocalStorage();
        
        return llmData.id;
    },
    
    // Get all LLMs
    getAllLLMs() {
        return [...this.createdLLMs];
    },
    
    // Get specific LLM by ID
    getLLMById(id) {
        return this.createdLLMs.find(llm => llm.id === id);
    },
    
    // Delete an LLM by ID
    deleteLLM(id) {
        const index = this.createdLLMs.findIndex(llm => llm.id === id);
        if (index !== -1) {
            this.createdLLMs.splice(index, 1);
            this.saveToLocalStorage();
            return true;
        }
        return false;
    },
    
    // Save all LLMs to localStorage
    saveToLocalStorage() {
        localStorage.setItem('createdLLMs', JSON.stringify(this.createdLLMs));
    },
    
    // Update an existing LLM
    updateLLM(llmData) {
        const index = this.createdLLMs.findIndex(llm => llm.id === llmData.id);
        if (index !== -1) {
            // Ensure color is stored in proper hex format
            if (llmData.color && !llmData.color.startsWith('#')) {
                llmData.color = '#' + llmData.color;
            }
            
            this.createdLLMs[index] = llmData;
            this.saveToLocalStorage();
            return true;
        }
        return false;
    },
    
    // Add to city data export
    addToCityData(cityData) {
        if (!cityData.llms) {
            cityData.llms = [];
        }
        cityData.llms = [...this.createdLLMs];
    },
    
    // Import from city data
    importFromCityData(cityData) {
        if (cityData.llms && Array.isArray(cityData.llms)) {
            this.createdLLMs = [...cityData.llms];
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }
};