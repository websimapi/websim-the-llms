export const cityData = {
    name: "Promptopia",
    description: "A peaceful city where LLMs live and thrive",
    founded: new Date().toISOString(),
    size: "small",
    lots: [
        {
            id: 1,
            name: "Central Hub",
            description: "Prime location in the center of town",
            width: 30,
            height: 30,
            x: 0,
            z: 0,
            price: 500,
            available: true,
            type: "commercial"
        },
        {
            id: 2,
            name: "North Residence",
            description: "Cozy spot with great views",
            width: 20,
            height: 20,
            x: -50,
            z: -50,
            price: 300,
            available: true,
            type: "residential"
        },
        {
            id: 3,
            name: "East Residence",
            description: "Spacious lot with morning sunlight",
            width: 20,
            height: 20,
            x: 50,
            z: -50,
            price: 320,
            available: true,
            type: "residential"
        },
        {
            id: 4,
            name: "South Residence",
            description: "Private lot with garden space",
            width: 20,
            height: 20,
            x: -50,
            z: 50,
            price: 280,
            available: true,
            type: "residential"
        },
        {
            id: 5,
            name: "West Residence",
            description: "Beautiful sunset views",
            width: 20,
            height: 20,
            x: 50,
            z: 50,
            price: 310,
            available: true,
            type: "residential"
        },
        {
            id: 6,
            name: "Innovation Park",
            description: "Perfect for tech startups",
            width: 25,
            height: 15,
            x: -80,
            z: 0,
            price: 450,
            available: true,
            type: "commercial"
        },
        {
            id: 7,
            name: "Training Ground",
            description: "Ideal for educational facilities",
            width: 15,
            height: 25,
            x: 80,
            z: 0,
            price: 420,
            available: true,
            type: "commercial"
        }
    ],
    saveGame: function() {
        // Get LLM data if available
        const llmData = [];
        if (typeof llmDataManager !== 'undefined') {
            llmDataManager.addToCityData(this);
        }
        
        return JSON.stringify({
            name: this.name,
            description: this.description,
            founded: this.founded,
            size: this.size,
            lots: this.lots,
            llms: this.llms || []
        });
    },
    loadGame: function(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.name = data.name;
            this.description = data.description;
            this.founded = data.founded;
            this.size = data.size;
            this.lots = data.lots;
            
            // Load LLMs if available
            if (data.llms && typeof llmDataManager !== 'undefined') {
                this.llms = data.llms;
                llmDataManager.importFromCityData(this);
            }
            
            return true;
        } catch (e) {
            console.error("Error loading game data:", e);
            return false;
        }
    }
};