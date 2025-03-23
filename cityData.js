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
            width: 12,
            height: 12,
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
            width: 10,
            height: 10,
            x: -15,
            z: -15,
            price: 300,
            available: true,
            type: "residential"
        },
        {
            id: 3,
            name: "East Residence",
            description: "Spacious lot with morning sunlight",
            width: 10,
            height: 10,
            x: 15,
            z: -15,
            price: 320,
            available: true,
            type: "residential"
        },
        {
            id: 4,
            name: "South Residence",
            description: "Private lot with garden space",
            width: 10,
            height: 10,
            x: -15,
            z: 15,
            price: 280,
            available: true,
            type: "residential"
        },
        {
            id: 5,
            name: "West Residence",
            description: "Beautiful sunset views",
            width: 10,
            height: 10,
            x: 15,
            z: 15,
            price: 310,
            available: true,
            type: "residential"
        },
        {
            id: 6,
            name: "Innovation Park",
            description: "Perfect for tech startups",
            width: 14,
            height: 8,
            x: -25,
            z: 0,
            price: 450,
            available: true,
            type: "commercial"
        },
        {
            id: 7,
            name: "Training Ground",
            description: "Ideal for educational facilities",
            width: 8,
            height: 14,
            x: 25,
            z: 0,
            price: 420,
            available: true,
            type: "commercial"
        }
    ],
    saveGame: function() {
        return JSON.stringify({
            name: this.name,
            description: this.description,
            founded: this.founded,
            size: this.size,
            lots: this.lots
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
            return true;
        } catch (e) {
            console.error("Error loading game data:", e);
            return false;
        }
    }
};