// LLM storage management system
export const llmStorage = {
    // Get all stored LLMs
    getAllLLMs() {
        const llmsJSON = localStorage.getItem('llms');
        return llmsJSON ? JSON.parse(llmsJSON) : [];
    },
    
    // Add new LLM to storage
    addLLM(llmData) {
        const llms = this.getAllLLMs();
        llmData.id = Date.now(); // Add unique ID
        llmData.createdDate = new Date().toISOString();
        llms.push(llmData);
        localStorage.setItem('llms', JSON.stringify(llms));
        return llmData;
    },
    
    // Get LLM by ID
    getLLM(id) {
        const llms = this.getAllLLMs();
        return llms.find(llm => llm.id === id);
    },
    
    // Update existing LLM
    updateLLM(id, newData) {
        const llms = this.getAllLLMs();
        const index = llms.findIndex(llm => llm.id === id);
        if (index >= 0) {
            llms[index] = { ...llms[index], ...newData };
            localStorage.setItem('llms', JSON.stringify(llms));
            return llms[index];
        }
        return null;
    },
    
    // Delete LLM by ID
    deleteLLM(id) {
        const llms = this.getAllLLMs();
        const updatedLLMs = llms.filter(llm => llm.id !== id);
        localStorage.setItem('llms', JSON.stringify(updatedLLMs));
    }
};