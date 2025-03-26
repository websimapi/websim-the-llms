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
    
    // If we have a stored voice to select
    const statusElement = document.getElementById('generation-status');
    if (statusElement && statusElement.dataset.profileImageUrl) {
        const voiceUri = statusElement.dataset.selectedVoice;
        for (let i = 0; i < voiceSelect.options.length; i++) {
            if (voiceSelect.options[i].value === voiceUri) {
                voiceSelect.selectedIndex = i;
                break;
            }
        }
    }
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
    
    // Update info panel position, keeping it within viewport
    updateInfoPanelPosition(event.clientX, event.clientY);
}

// Hide the info panel
function hideInfoPanel() {
    infoPanel.style.display = 'none';
    infoPanel.style.opacity = 0; // Hide with opacity transition

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
    requestAnimationFrame(() => { // Ensure display:block is applied before opacity transition
        infoPanel.style.opacity = 1;
    });
}

// Format seconds into a more readable time format
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return mins > 0 ? `${hours}hr ${mins}m` : `${hours}hr`;
    }
}

// New function to update info panel position and keep it within bounds
function updateInfoPanelPosition(clientX, clientY) {
    if (!infoPanel) return;

    const panelWidth = infoPanel.offsetWidth;
    const panelHeight = infoPanel.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buffer = 10; // Buffer from screen edge

    let targetLeft = clientX + 15;
    let targetTop = clientY + 15;

    // Adjust horizontal position if panel goes off-screen right
    if (targetLeft + panelWidth + buffer > viewportWidth) {
        targetLeft = clientX - panelWidth - 15;
        // If it still goes off-screen left, reset to near edge
        if (targetLeft < buffer) {
            targetLeft = buffer;
        }
    }

    // Adjust vertical position if panel goes off-screen bottom
    if (targetTop + panelHeight + buffer > viewportHeight) {
        targetTop = clientY - panelHeight - 15;
         // If it still goes off-screen top, reset to near edge
        if (targetTop < buffer) {
            targetTop = buffer;
        }
    }

    infoPanel.style.left = `${targetLeft}px`;
    infoPanel.style.top = `${targetTop}px`;
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

    // If no direct hits, check against bounding boxes for hover detection
    let intersectedPlot = null;
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && (!obj.userData || obj.userData.type !== 'lot')) {
            obj = obj.parent;
            if (!obj) break;
        }
        intersectedPlot = obj;
    } else {
        // Check bounding boxes only if no direct hit
        const intersectPoint = new THREE.Vector3();
        for (const plot of plotObjects) {
            if (!plot.userData.boundingBox) {
                const box = new THREE.Box3().setFromObject(plot);
                plot.userData.boundingBox = box;
            }
            if (raycaster.ray.intersectsBox(plot.userData.boundingBox, intersectPoint)) {
                intersectedPlot = plot; // Consider this plot as intersected
                break;
            }
        }
    }

    if (intersectedPlot && intersectedPlot.userData && intersectedPlot.userData.id) {
        // We have a valid hovered plot
        const plotId = intersectedPlot.userData.id;

        if (activePlotId !== plotId) {
            // Reset previous highlight if any
            if (activePlotId) {
                const previousPlot = findPlotObject(activePlotId);
                if (previousPlot) resetPlotHighlight(previousPlot);
            }
            // Highlight the new plot
            highlightPlot(intersectedPlot);
            activePlotId = plotId;
        }

        // Show or update info panel
        showInfoPanel(intersectedPlot);

    } else {
        // No intersection or invalid plot found
        if (infoPanel.style.display !== 'none') {
            hideInfoPanel();
        }
        // No need to reset activePlotId here, hideInfoPanel handles it
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

        // Update mouse position for raycasting
        const canvas = renderer.domElement;
        const rect = canvas.getBoundingClientRect();

        mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        // Position panel near touch point, ensuring it stays within bounds
        updateInfoPanelPosition(touch.clientX, touch.clientY);

        // Force an immediate check for plot intersection
        checkPlotHovers();

        // For mobile, we'll keep the panel visible until touch end or timeout
        // No need to do anything else here
    }
}

// Handle touch end
function onTouchEnd(event) {
    // Keep panel visible for a short time to allow reading
    setTimeout(hideInfoPanel, 3000);
}