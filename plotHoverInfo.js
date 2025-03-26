import * as THREE from 'three';
import { cityData } from './cityData.js';
import { safeSetEmissive } from './threeJSGlobals.js';

let raycaster, mouse, camera, scene, renderer;
let infoPanel, activePlotId;

// Initialize hover functionality
export function initPlotHoverInfo(mainCamera, mainScene, mainRenderer) {
    // Store references
    camera = mainCamera;
    scene = mainScene;
    renderer = mainRenderer;
    
    // Create raycaster for hover detection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Create info panel HTML element
    createInfoPanel();
    
    // Add event listeners
    const canvas = renderer.domElement;
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', hideInfoPanel);
    
    // Add touch event handling for mobile
    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('touchend', onTouchEnd);
    
    // Expose handlers globally for other modules
    window.plotHoverHandlers = {
        onTouchStart: onTouchStart
    };
    
    // Start checking for plot hovers
    checkPlotHovers();
}

// Create the info panel HTML element
function createInfoPanel() {
    infoPanel = document.createElement('div');
    infoPanel.className = 'plot-info-panel';
    infoPanel.style.display = 'none';
    document.body.appendChild(infoPanel);
    
    // Add the coin styles
    const coinStyles = document.createElement('link');
    coinStyles.rel = 'stylesheet';
    coinStyles.href = 'plotCoinStyles.css';
    document.head.appendChild(coinStyles);
}

// Handle mouse movement
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update info panel position to follow cursor
    infoPanel.style.left = `${event.clientX + 15}px`;
    infoPanel.style.top = `${event.clientY + 15}px`;
}

// Hide the info panel
function hideInfoPanel() {
    infoPanel.style.display = 'none';
    
    // Reset any highlighted plots
    if (activePlotId) {
        const activePlot = findPlotObject(activePlotId);
        if (activePlot) {
            resetPlotHighlight(activePlot);
        }
        activePlotId = null;
    }
}

// Show the info panel with plot data
function showInfoPanel(plot) {
    // Find the plot data by ID
    const plotData = cityData.lots.find(lot => lot.id === plot.userData.id);
    
    if (!plotData) return;
    
    // Calculate estimated construction time
    const minSeconds = plotData.price * 3;
    const maxSeconds = plotData.price * 7;
    const minTimeFormatted = formatTime(minSeconds);
    const maxTimeFormatted = formatTime(maxSeconds);
    
    // Update content
    infoPanel.innerHTML = `
        <div class="plot-info-header">${plotData.name}</div>
        <div class="plot-info-content">
            <div class="plot-info-row">
                <span class="plot-info-label">Size:</span>
                <span class="plot-info-value">${plotData.width}m × ${plotData.height}m</span>
            </div>
            <div class="plot-info-row">
                <span class="plot-info-label">Type:</span>
                <span class="plot-info-value">${capitalizeFirstLetter(plotData.type)}</span>
            </div>
            <div class="plot-info-row">
                <span class="plot-info-label">Credits:</span>
                <span class="plot-info-value websim-credits">${plotData.price} <img src="/websim-credit.png" class="credit-icon" alt="Credits"></span>
            </div>
            <div class="plot-info-row">
                <span class="plot-info-label">Est.:</span>
                <span class="plot-info-value">${minTimeFormatted} - ${maxTimeFormatted}</span>
            </div>
            <div class="plot-info-row">
                <span class="plot-info-label">Status:</span>
                <span class="plot-info-value ${plotData.available ? 'available' : 'unavailable'}">
                    ${plotData.available ? 'Available' : 'Occupied'}
                </span>
            </div>
            <div class="plot-info-description">${plotData.description}</div>
        </div>
    `;
    
    // Show the panel
    infoPanel.style.display = 'block';
}

// Format seconds into a more readable time format
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds} sec`;
    } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
    }
}

// Continuous check for plot hovers
function checkPlotHovers() {
    requestAnimationFrame(checkPlotHovers);
    
    if (!scene || !camera) return;
    
    // Update the picking ray
    raycaster.setFromCamera(mouse, camera);
    
    // Find all plot objects in the scene
    const plotObjects = [];
    scene.traverse(obj => {
        if (obj.userData && obj.userData.type === 'lot') {
            plotObjects.push(obj);
        }
    });
    
    // First try direct hits on the plot outlines
    let intersects = raycaster.intersectObjects(plotObjects, true);
    
    // If no hits, check against the plot bounding boxes, which are larger
    if (intersects.length === 0) {
        // Create a box for each plot to check against
        for (const plot of plotObjects) {
            // Create a bounding box if not already created
            if (!plot.userData.boundingBox) {
                const box = new THREE.Box3().setFromObject(plot);
                // Store the box in userData
                plot.userData.boundingBox = box;
            }
            
            // Check if ray intersects the bounding box
            const intersectPoint = new THREE.Vector3();
            if (raycaster.ray.intersectsBox(plot.userData.boundingBox, intersectPoint)) {
                // Create a fake intersection with the plot
                intersects.push({
                    object: plot,
                    distance: raycaster.ray.origin.distanceTo(intersectPoint)
                });
                break; // Only need one hit
            }
        }
    }
    
    if (intersects.length > 0) {
        // Find the actual plot parent object (not the construction tape or cones)
        let plot = intersects[0].object;
        
        // Traverse up to find the parent plot
        while (plot && (!plot.userData || plot.userData.type !== 'lot')) {
            plot = plot.parent;
            if (!plot) break; // Safety check
        }
        
        if (plot && plot.userData && plot.userData.id) {
            // If we're hovering over a different plot, reset the previous one
            if (activePlotId && activePlotId !== plot.userData.id) {
                const previousPlot = findPlotObject(activePlotId);
                if (previousPlot) {
                    resetPlotHighlight(previousPlot);
                }
            }
            
            // Highlight the current plot
            highlightPlot(plot);
            
            // Show info panel
            showInfoPanel(plot);
            
            // Store current active plot ID
            activePlotId = plot.userData.id;
            
            return; // Exit early
        }
    }
    
    // If no intersections, hide panel
    if (infoPanel.style.display !== 'none') {
        hideInfoPanel();
    }
}

// Find a plot object by ID
function findPlotObject(id) {
    let foundPlot = null;
    scene.traverse(obj => {
        if (obj.userData && obj.userData.type === 'lot' && obj.userData.id === id) {
            foundPlot = obj;
        }
    });
    return foundPlot;
}

// Highlight a plot
function highlightPlot(plot) {
    // Find construction tape material
    plot.traverse(child => {
        if (child.isMesh) {
            // Store original material for reset
            if (!child.userData.originalMaterial) {
                child.userData.originalMaterial = child.material.clone();
            }
            
            // Highlight based on mesh type
            if (child.name && child.name.includes('tape')) {
                // Safely set emissive properties
                safeSetEmissive(child.material, 0xffff00);
            } else if (child.name && child.name.includes('cone')) {
                // Safely set emissive properties
                safeSetEmissive(child.material, 0xff5500, 0.5);
            } else if (child.name && child.name.includes('pole')) {
                // Safely set emissive properties
                safeSetEmissive(child.material, 0x8B4513, 0.2);
            }
        }
    });
}

// Reset plot highlight
function resetPlotHighlight(plot) {
    plot.traverse(child => {
        if (child.isMesh && child.userData.originalMaterial) {
            // Reset to original material
            if (child.material) {
                // Copy only the properties that exist on the target material
                if (child.material.color && child.userData.originalMaterial.color) {
                    child.material.color.copy(child.userData.originalMaterial.color);
                }
                if (child.material.emissive && child.userData.originalMaterial.emissive) {
                    child.material.emissive.copy(child.userData.originalMaterial.emissive);
                }
                if (child.material.emissiveIntensity !== undefined && 
                    child.userData.originalMaterial.emissiveIntensity !== undefined) {
                    child.material.emissiveIntensity = child.userData.originalMaterial.emissiveIntensity;
                }
            }
        }
    });
}

// Helper to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// New function to handle touch events
function onTouchStart(event) {
    // Prevent default behavior
    if (event.cancelable) {
        event.preventDefault();
    }
    
    // Use the first touch point
    if (event.touches && event.touches.length > 0) {
        const touch = event.touches[0];
        
        // Update mouse position
        const canvas = renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        
        mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Position panel near touch point
        infoPanel.style.left = `${touch.clientX + 15}px`;
        infoPanel.style.top = `${touch.clientY + 15}px`;
        
        // Force an immediate check for plot intersection
        checkPlotHovers();
        
        // For mobile, we'll keep the panel visible until touch end
        // No need to do anything else here
    }
}

// Handle touch end
function onTouchEnd(event) {
    // Keep panel visible for a short time to allow reading
    setTimeout(hideInfoPanel, 3000);
}