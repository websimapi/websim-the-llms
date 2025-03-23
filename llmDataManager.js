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
        
        // Process model data to preserve orientations
        if (llmData.modelData) {
            this.processModelOrientationData(llmData);
        }
        
        // Add to array
        this.createdLLMs.push(llmData);
        
        // Save to localStorage
        this.saveToLocalStorage();
        
        return llmData.id;
    },
    
    // Process model data to preserve object orientations
    processModelOrientationData(llmData) {
        // If there's model transformation data, ensure it's properly formatted
        if (llmData.modelTransforms && Array.isArray(llmData.modelTransforms)) {
            llmData.modelTransforms = llmData.modelTransforms.map(transform => {
                return {
                    id: transform.id || Math.random().toString(36).substr(2, 9),
                    position: transform.position || { x: 0, y: 0, z: 0 },
                    rotation: transform.rotation || { x: 0, y: 0, z: 0 },
                    scale: transform.scale || { x: 1, y: 1, z: 1 }
                };
            });
        }
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