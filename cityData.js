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
            maxCapacity: 8,
            occupants: []
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
            maxCapacity: 8,
            occupants: []
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
            maxCapacity: 8,
            occupants: []
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
            maxCapacity: 8,
            occupants: []
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
            maxCapacity: 8,
            occupants: []
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
            maxCapacity: 8,
            occupants: []
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
            maxCapacity: 8,
            occupants: []
        }
    ],
    updatePlotOccupancy(plotId, llmId, addOccupant = true) {
        const plot = this.lots.find(lot => lot.id === plotId);
        if (!plot) return false;
        
        // Initialize occupants array if it doesn't exist
        if (!plot.occupants) {
            plot.occupants = [];
        }
        
        if (addOccupant) {
            // Add occupant if not already in the plot
            if (!plot.occupants.includes(llmId)) {
                plot.occupants.push(llmId);
                // Also call llmDataManager to update the LLM's status
                if (typeof llmDataManager !== 'undefined') {
                    llmDataManager.placeLLMInPlot(llmId, plotId);
                }
                return true;
            }
        } else {
            // Remove occupant
            const index = plot.occupants.indexOf(llmId);
            if (index !== -1) {
                plot.occupants.splice(index, 1);
                return true;
            }
        }
        
        return false;
    }
};