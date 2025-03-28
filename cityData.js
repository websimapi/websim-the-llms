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
            price: 50,
            available: true,
            type: "commercial",
            requirements: ["assistant", "creator", "researcher"],
            occupiedBy: null, 
            placedModel: null 
        },
        {
            id: 2,
            name: "North Residence",
            description: "Cozy spot with great views",
            width: 20,
            height: 20,
            x: -50,
            z: -50,
            price: 30,
            available: true,
            type: "residential",
            requirements: ["humanoid"],
            occupiedBy: null,
            placedModel: null
        },
        {
            id: 3,
            name: "East Residence",
            description: "Spacious lot with morning sunlight",
            width: 20,
            height: 20,
            x: 50,
            z: -50,
            price: 32,
            available: true,
            type: "residential",
            requirements: ["humanoid"],
            occupiedBy: null,
            placedModel: null
        },
        {
            id: 4,
            name: "South Residence",
            description: "Private lot with garden space",
            width: 20,
            height: 20,
            x: -50,
            z: 50,
            price: 28,
            available: true,
            type: "residential",
            requirements: ["humanoid"],
            occupiedBy: null,
            placedModel: null
        },
        {
            id: 5,
            name: "West Residence",
            description: "Beautiful sunset views",
            width: 20,
            height: 20,
            x: 50,
            z: 50,
            price: 31,
            available: true,
            type: "residential",
            requirements: ["humanoid"],
            occupiedBy: null,
            placedModel: null
        },
        {
            id: 6,
            name: "Innovation Park",
            description: "Perfect for tech startups",
            width: 25,
            height: 15,
            x: -80,
            z: 0,
            price: 45,
            available: true,
            type: "commercial",
            requirements: ["creator", "researcher"],
            occupiedBy: null,
            placedModel: null
        },
        {
            id: 7,
            name: "Training Ground",
            description: "Ideal for educational facilities",
            width: 15,
            height: 25,
            x: 80,
            z: 0,
            price: 42,
            available: true,
            type: "commercial",
            requirements: ["assistant", "companion"],
            occupiedBy: null,
            placedModel: null
        }
    ],
    resetLots: function() {
        this.lots.forEach(lot => {
            lot.available = true;
            lot.occupiedBy = null;
            if (lot.placedModel && lot.placedModel.parent) {
                lot.placedModel.parent.remove(lot.placedModel);
            }
            lot.placedModel = null;
        });
        console.log("Reset all plot availability.");
    },
    saveGame: function() {
        const saveData = {
            name: this.name,
            description: this.description,
            founded: this.founded,
            size: this.size,
            lots: this.lots.map(lot => ({
                id: lot.id,
                name: lot.name,
                description: lot.description,
                width: lot.width,
                height: lot.height,
                x: lot.x,
                z: lot.z,
                price: lot.price,
                available: lot.available,
                type: lot.type,
                requirements: lot.requirements,
                occupiedBy: lot.occupiedBy 
            })),
            llms: llmDataManager.getAllLLMs() 
        };
        return JSON.stringify(saveData, null, 2); 
    },
    loadGame: function(jsonData) {
        try {
            const loadData = JSON.parse(jsonData);

            this.name = loadData.name || this.name;
            this.description = loadData.description || this.description;
            this.founded = loadData.founded || this.founded;
            this.size = loadData.size || this.size;

            if (loadData.lots && Array.isArray(loadData.lots)) {
                loadData.lots.forEach(loadedLot => {
                    const existingLot = this.lots.find(lot => lot.id === loadedLot.id);
                    if (existingLot) {
                        existingLot.available = loadedLot.available;
                        existingLot.occupiedBy = loadedLot.occupiedBy;
                        existingLot.placedModel = null;
                    } else {
                        this.lots.push({
                            ...loadedLot,
                            placedModel: null 
                        });
                    }
                });
            }

            if (loadData.llms) {
                llmDataManager.importFromCityData(loadData);
            }

            console.log("Game data loaded successfully.");
            return true; 

        } catch (error) {
            console.error("Error loading game data:", error);
            return false; 
        }
    }
};