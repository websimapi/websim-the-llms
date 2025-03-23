// LLM Service for interacting with language models
class LLMService {
    constructor() {
        this.enabled = localStorage.getItem('llmEnabled') === 'true';
        this.conversationHistory = [];
    }

    // Toggle LLM functionality on/off
    toggleLLM(enabled) {
        this.enabled = enabled;
        localStorage.setItem('llmEnabled', enabled);
        return this.enabled;
    }

    // Check if LLM is enabled
    isEnabled() {
        return this.enabled;
    }

    // Generate a loading tip
    async generateTip() {
        if (!this.enabled) return null;

        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful AI assistant providing tips for a game called 'The LLMs' (Life Learning Models). Generate a single, short, creative tip about managing AI models in a simulation game. Keep it under 100 characters. Make it sound like a game tip. Only return the tip text, nothing else."
                    }
                ]
            });
            
            return completion.content;
        } catch (error) {
            console.error("Error generating tip:", error);
            return null;
        }
    }

    // Add a message to conversation history
    addMessage(message, role = "user") {
        this.conversationHistory.push({
            role,
            content: message
        });
        
        // Keep history to last 10 messages
        if (this.conversationHistory.length > 10) {
            this.conversationHistory = this.conversationHistory.slice(-10);
        }
    }

    // Get a response from LLM
    async getResponse(prompt, systemPrompt = null) {
        if (!this.enabled) return null;

        try {
            const messages = [];
            
            if (systemPrompt) {
                messages.push({
                    role: "system",
                    content: systemPrompt
                });
            }
            
            this.addMessage(prompt);
            messages.push(...this.conversationHistory);
            
            const completion = await websim.chat.completions.create({
                messages
            });
            
            this.addMessage(completion.content, "assistant");
            return completion.content;
        } catch (error) {
            console.error("Error getting LLM response:", error);
            return null;
        }
    }

    // Generate image from prompt
    async generateImage(prompt, options = {}) {
        if (!this.enabled) return null;

        try {
            const result = await websim.imageGen({
                prompt,
                ...options
            });
            
            return result.url;
        } catch (error) {
            console.error("Error generating image:", error);
            return null;
        }
    }

    // Process JSON output
    async processJSON(prompt, jsonSchema, systemPrompt = null) {
        if (!this.enabled) return null;

        try {
            const messages = [];
            
            if (systemPrompt) {
                messages.push({
                    role: "system",
                    content: `${systemPrompt}\nRespond directly with JSON, following this JSON schema, and no other text.\n${JSON.stringify(jsonSchema, null, 2)}`
                });
            } else {
                messages.push({
                    role: "system",
                    content: `Respond directly with JSON, following this JSON schema, and no other text.\n${JSON.stringify(jsonSchema, null, 2)}`
                });
            }
            
            messages.push({
                role: "user",
                content: prompt
            });
            
            const completion = await websim.chat.completions.create({
                messages,
                json: true
            });
            
            return JSON.parse(completion.content);
        } catch (error) {
            console.error("Error processing JSON:", error);
            return null;
        }
    }
}

// Export as singleton
export const llmService = new LLMService();