import { cityData } from './cityData.js';

let hoverInfoPanel = null;
let hoveredPlot = null;

// Create and initialize the hover info panel
export function initPlotHoverUI() {
    // Create panel element if it doesn't exist
    if (!hoverInfoPanel) {
        hoverInfoPanel = document.createElement('div');
        hoverInfoPanel.className = 'plot-hover-panel hidden';
        hoverInfoPanel.innerHTML = `
            <div class="plot-hover-header"></div>
            <div class="plot-hover-content">
                <div class="plot-hover-size"></div>
                <div class="plot-hover-price"></div>
                <div class="plot-hover-status"></div>
                <div class="plot-hover-type"></div>
            </div>
        `;
        document.body.appendChild(hoverInfoPanel);
    }
    
    // Add raycaster to detect plot hover
    setupPlotHoverDetection();
}

// Setup raycaster and event listeners for plot hover detection
function setupPlotHoverDetection() {
    const cityViewElement = document.getElementById('city-view');
    const renderer = cityViewElement.querySelector('canvas');
    
    if (!renderer) {
        console.error('City view renderer not found');
        return;
    }
    
    // Create raycaster for hover detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Add mousemove listener
    renderer.addEventListener('mousemove', (event) => {
        // Calculate mouse position in normalized device coordinates
        const rect = renderer.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update the raycaster
        raycaster.setFromCamera(mouse, window.cityCamera);
        
        // Find intersections with plots
        const intersects = raycaster.intersectObjects(window.cityPlots || [], true);
        
        // Check if we're hovering over a plot
        if (intersects.length > 0) {
            let plotObject = intersects[0].object;
            
            // Traverse up to find the group with plot data
            while (plotObject && (!plotObject.userData || !plotObject.userData.type || plotObject.userData.type !== 'lot')) {
                plotObject = plotObject.parent;
                if (!plotObject) break;
            }
            
            // If we found a plot, show info
            if (plotObject && plotObject.userData && plotObject.userData.type === 'lot') {
                const plotId = plotObject.userData.id;
                const plotData = cityData.lots.find(lot => lot.id === plotId);
                
                if (plotData) {
                    showPlotInfo(plotData, event.clientX, event.clientY);
                    hoveredPlot = plotObject;
                }
            }
        } else {
            // If not hovering over any plot, hide the panel
            hidePlotInfo();
            hoveredPlot = null;
        }
    });
    
    // Hide panel when mouse leaves the renderer
    renderer.addEventListener('mouseleave', () => {
        hidePlotInfo();
        hoveredPlot = null;
    });
}

// Show plot information panel at mouse position
function showPlotInfo(plotData, x, y) {
    if (!hoverInfoPanel) return;
    
    // Update panel content
    hoverInfoPanel.querySelector('.plot-hover-header').textContent = plotData.name;
    hoverInfoPanel.querySelector('.plot-hover-size').textContent = `Size: ${plotData.width}m × ${plotData.height}m`;
    hoverInfoPanel.querySelector('.plot-hover-price').textContent = `Price: §${plotData.price}`;
    hoverInfoPanel.querySelector('.plot-hover-status').textContent = `Status: ${plotData.available ? 'Available' : 'Occupied'}`;
    hoverInfoPanel.querySelector('.plot-hover-type').textContent = `Type: ${capitalizeFirstLetter(plotData.type)}`;
    
    // Position panel near the mouse but ensure it stays within viewport
    const panelWidth = 250; // Approximate width
    const panelHeight = 150; // Approximate height
    
    let posX = x + 15; // Offset from cursor
    let posY = y + 15;
    
    // Adjust position if panel would go outside viewport
    if (posX + panelWidth > window.innerWidth) {
        posX = x - panelWidth - 15;
    }
    
    if (posY + panelHeight > window.innerHeight) {
        posY = y - panelHeight - 15;
    }
    
    // Set position and show panel
    hoverInfoPanel.style.left = `${posX}px`;
    hoverInfoPanel.style.top = `${posY}px`;
    hoverInfoPanel.classList.remove('hidden');
}

// Hide plot information panel
function hidePlotInfo() {
    if (hoverInfoPanel) {
        hoverInfoPanel.classList.add('hidden');
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}