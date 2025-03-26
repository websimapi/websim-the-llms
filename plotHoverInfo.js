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
        onTouchStart: onTouchStart
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

            // Store current active plot ID
            activePlotId = plot.userData.id;
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