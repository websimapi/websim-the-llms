import * as THREE from 'three';
import { cityData } from './cityData.js';
import { safeSetEmissive } from './threeJSGlobals.js';

let raycaster, mouse, camera, scene, renderer;
let infoPanel, activePlotId;
let isMobile = false; // Flag to detect mobile environment
let touchTimeout = null; // Timeout for hiding panel on touch end

// Initialize hover functionality
export function initPlotHoverInfo(mainCamera, mainScene, mainRenderer) {
    // Store references
    camera = mainCamera;
    scene = mainScene;
    renderer = mainRenderer;

    // Simple mobile detection
    isMobile = window.innerWidth <= 768;

    // Create raycaster for hover detection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create info panel HTML element
    createInfoPanel();

    // Add event listeners
    const canvas = renderer.domElement;
    if (!isMobile) {
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', hideInfoPanel);
    } else {
        // Use touch events for mobile
        canvas.addEventListener('touchstart', onTouchStart);
        // We will hide the panel manually after a delay in onTouchEnd
    }

    // Expose handlers globally for other modules (if needed)
    window.plotHoverHandlers = {
        onTouchStart: onTouchStart,
        onPlotClick: () => {}
    };

    // Start checking for plot hovers (will work for both mouse and touch)
    checkPlotHovers();

    // Update mobile flag on resize
    window.addEventListener('resize', () => {
        isMobile = window.innerWidth <= 768;
        // Potentially re-attach/detach listeners if needed, but current setup might be fine
    });
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

// Handle mouse movement (desktop only)
function onMouseMove(event) {
    if (isMobile) return;

    // Calculate mouse position in normalized device coordinates
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Request check immediately on mouse move for responsiveness
    checkPlotHovers(event.clientX, event.clientY);
}

// Handle touch start (mobile only)
function onTouchStart(event) {
    if (!isMobile) return;

    // Prevent default scroll/zoom behavior
    if (event.cancelable) {
        event.preventDefault();
    }

    // Use the first touch point
    if (event.touches && event.touches.length > 0) {
        const touch = event.touches[0];

        // Update mouse vector for raycasting
        const canvas = renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        // Force an immediate check for plot intersection
        // Pass touch coordinates for potential positioning (though we'll use fixed on mobile)
        checkPlotHovers(touch.clientX, touch.clientY);

        // Add touch end listener to hide the panel after a delay
        // Clear previous timeout if exists
        if (touchTimeout) clearTimeout(touchTimeout);
        // Add a temporary listener for the touchend event
        canvas.addEventListener('touchend', onTouchEnd, { once: true });

    }
}

// Handle touch end (mobile only)
function onTouchEnd(event) {
     // Keep panel visible for a short time to allow reading
     touchTimeout = setTimeout(hideInfoPanel, 3000);
}

// Hide the info panel
function hideInfoPanel() {
    infoPanel.style.display = 'none';
    infoPanel.classList.remove('mobile-fixed'); // Remove fixed class

    // Reset any highlighted plots
    if (activePlotId) {
        const activePlot = findPlotObject(activePlotId);
        if (activePlot) {
            resetPlotHighlight(activePlot);
        }
        activePlotId = null;
    }

    // Clear the touch end timeout if it's still pending
    if (touchTimeout) {
        clearTimeout(touchTimeout);
        touchTimeout = null;
    }
}

// Show the info panel with plot data
function showInfoPanel(plot, clientX, clientY) {
    // Find the plot data by ID
    const plotData = cityData.lots.find(lot => lot.id === plot.userData.id);

    if (!plotData) return;

    // Calculate estimated construction time
    const minSeconds = plotData.price * 3;
    const maxSeconds = plotData.price * 7;
    const minTimeFormatted = formatTime(minSeconds);
    const maxTimeFormatted = formatTime(maxSeconds);

    // Build HTML content
    let htmlContent = `
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
            </div>`;
    
    // Add requirements section for commercial plots
    if ((plotData.type === 'commercial' || plotData.type === 'residential') && plotData.requirements && plotData.requirements.length > 0) {
        htmlContent += `
            <div class="plot-info-requirements">
                <div class="requirements-title">Required Models:</div>
                <div class="requirements-icons">`;
        
        // Add icons for each required model type
        plotData.requirements.forEach(modelType => {
            htmlContent += `<div class="requirement-icon ${modelType}" title="${capitalizeFirstLetter(modelType)}">
                ${getModelTypeIcon(modelType)}
            </div>`;
        });
        
        htmlContent += `
                </div>
            </div>`;
    }
    
    // Add description and close content div
    htmlContent += `
            <div class="plot-info-description">${plotData.description}</div>
        </div>`;

    // Update content
    infoPanel.innerHTML = htmlContent;

    // Show the panel and apply positioning
    infoPanel.style.display = 'block';
    if (isMobile) {
        // Apply fixed positioning class for mobile
        infoPanel.classList.add('mobile-fixed');
        // Reset inline styles that might interfere
        infoPanel.style.left = '';
        infoPanel.style.top = '';
    } else {
        // Follow cursor for desktop
        infoPanel.classList.remove('mobile-fixed');
        infoPanel.style.left = `${clientX + 15}px`;
        infoPanel.style.top = `${clientY + 15}px`;
    }

    // Store current active plot ID
    activePlotId = plot.userData.id;

    // Add click functionality for plot selection during transport mode
    if (window.currentTransportLLMId && window.plotHoverHandlers && 
        typeof window.plotHoverHandlers.onPlotClick === 'function') {
        // Make the panel interactive during transport mode
        infoPanel.style.pointerEvents = 'auto';
        
        // Add a "Select Plot" button if not already present
        if (!infoPanel.querySelector('.select-plot-btn')) {
            const selectBtn = document.createElement('button');
            selectBtn.className = 'select-plot-btn';
            selectBtn.textContent = 'Transport Here';
            selectBtn.addEventListener('click', function() {
                window.plotHoverHandlers.onPlotClick(plot.userData.id);
            });
            
            // Add button to the panel
            const content = infoPanel.querySelector('.plot-info-content');
            if (content) {
                content.appendChild(document.createElement('hr'));
                content.appendChild(selectBtn);
            }
        }
    } else {
        // Reset to non-interactive
        infoPanel.style.pointerEvents = 'none';
    }
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

// Helper function to get model type icon SVG
function getModelTypeIcon(modelType) {
    switch(modelType) {
        case 'assistant':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 16h-4.83l-1.17 1.17-1.17-1.17H5V4h14v14z"/>
                <path d="M11 15h2v2h-2zm0-8h2v6h-2z"/>
            </svg>`;
        case 'creator':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 0 0 0-1.41z"/>
            </svg>`;
        case 'researcher':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M9.5 16c-1.93 0-3.5-1.57-3.5-3.5S7.57 9 9.5 9s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5zm5.5-1l5 5-1.5 1.5-5-5V15l-0.03-0.03c-1.45 1.28-3.36 2.03-5.47 2.03-4.56 0-8.25-3.69-8.25-8.25s3.69-8.25 8.25-8.25S17 4.19 17 8.75c0 2.11-0.76 4.02-2.05 5.47L15 14.24z"/>
            </svg>`;
        case 'companion':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/>
            </svg>`;
        case 'humanoid':
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
            </svg>`;
        default:
            return '';
    }
}

// Keep a reference to the animation frame request
let hoverCheckFrameId = null;

// Continuous check for plot hovers
function checkPlotHovers(clientX, clientY) {
    // Cancel previous frame request if any
    if(hoverCheckFrameId) cancelAnimationFrame(hoverCheckFrameId);

    // Schedule the check for the next animation frame
    hoverCheckFrameId = requestAnimationFrame(() => {
        _performHoverCheck(clientX, clientY);
        hoverCheckFrameId = null; // Reset ID after execution
    });
}

// Renamed the internal checking logic
function _performHoverCheck(clientX, clientY) {
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

    let foundIntersect = false;
    if (intersects.length > 0) {
        // Find the actual plot parent object (not the construction tape or cones)
        let plot = intersects[0].object;

        // Traverse up to find the parent plot
        while (plot && (!plot.userData || plot.userData.type !== 'lot')) {
            plot = plot.parent;
            if (!plot) break; // Safety check
        }

        if (plot && plot.userData && plot.userData.id) {
            foundIntersect = true;
            // If we're hovering over a different plot, reset the previous one
            if (activePlotId && activePlotId !== plot.userData.id) {
                const previousPlot = findPlotObject(activePlotId);
                if (previousPlot) {
                    resetPlotHighlight(previousPlot);
                }
            }

            // Highlight the current plot only if it's not already active
            if (activePlotId !== plot.userData.id) {
                highlightPlot(plot);
            }

            // Show info panel (pass coordinates for positioning)
            showInfoPanel(plot, clientX, clientY);
        }
    }

    // If no valid intersections found this frame
    if (!foundIntersect && !isMobile) { // Don't auto-hide on mobile hover-off
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
            // Store original material for reset only if not already highlighted
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
            // Reset to original material properties safely
            const original = child.userData.originalMaterial;
            if (child.material.color && original.color) {
                child.material.color.copy(original.color);
            }
            if (child.material.emissive && original.emissive) {
                child.material.emissive.copy(original.emissive);
            }
            if (child.material.emissiveIntensity !== undefined && original.emissiveIntensity !== undefined) {
                child.material.emissiveIntensity = original.emissiveIntensity;
            }
             // Remove the stored original material reference after resetting
             delete child.userData.originalMaterial;
        }
    });
}

// Helper to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}