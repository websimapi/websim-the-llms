import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { config } from './config.js';
import { cityData } from './cityData.js';
import { setupSceneLighting } from './advancedLighting.js';
import { createPlotOutline } from './plotConstructionElements.js';
import { createInfiniteTerrain } from './infiniteTerrain.js';
import { CameraBoundaryController } from './cameraBoundaryController.js';
import { createDistanceMist } from './terrainUtils.js';
import { setupUIInteractions, setupConsolePanel } from './citySceneUI.js';
import { initPlotHoverInfo } from './plotHoverInfo.js';
// Import the drone auto-navigation function
import { startAutoNavigation } from './llmDroneTransport.js';

// Expose main scene components globally or via getters for drone transport
let scene, camera, controls, renderer;
window.cityScene = scene; // Quick global access (consider a getter pattern later)
window.camera = camera;
window.controls = controls;

// Add fadeOutAudio function at global level
function fadeOutAudio(duration = 3000) {
    const audio = document.querySelector('audio');
    if (!audio) return;

    const startVolume = audio.volume;
    const fadeSteps = 50;
    const volumeStep = startVolume / fadeSteps;
    const intervalTime = duration / fadeSteps;

    const fadeInterval = setInterval(() => {
        if (audio.volume > volumeStep) {
            audio.volume -= volumeStep;
        } else {
            audio.volume = 0;
            audio.pause();
            clearInterval(fadeInterval);
        }
    }, intervalTime);
}

document.addEventListener('DOMContentLoaded', () => {
    // Make fadeOutAudio globally accessible
    window.fadeOutAudio = fadeOutAudio;

    // Wait for game container to be visible
    const gameContainer = document.getElementById('game-container');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (!gameContainer.classList.contains('hidden')) {
                    initCityScene();
                    observer.disconnect();
                }
            }
        });
    });

    observer.observe(gameContainer, { attributes: true });

    // Initialize directly if skip button was clicked
    if (!gameContainer.classList.contains('hidden')) {
        initCityScene();
        observer.disconnect();
    }
});

function initCityScene() {
    const cityViewElement = document.getElementById('city-view');

    // Initialize Three.js scene
    scene = new THREE.Scene(); // Assign to global variable
    scene.background = new THREE.Color(0xe0f5e0);
    window.cityScene = scene; // Update global reference

    // Create camera
    camera = new THREE.PerspectiveCamera( // Assign to global variable
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        5000 // Increased far plane for larger terrain/fog distance
    );
    window.camera = camera; // Update global reference

    // Set initial camera position further out for cinematic intro
    camera.position.set(50, 30, 50);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ // Assign to global variable
        antialias: true,
        powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimized pixel ratio
    // Shadow map configuration moved to setupSceneLighting
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct property name for r152+
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Improved tone mapping
    renderer.toneMappingExposure = 1.2; // Adjust exposure for better lighting
    cityViewElement.appendChild(renderer.domElement);

    // Add click listener for drone auto-navigation
    renderer.domElement.addEventListener('click', handleCityClick);

    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement); // Assign to global variable
    window.controls = controls; // Update global reference

    // Create infinite terrain instead of just a ground plane
    const terrain = createInfiniteTerrain(scene, config.citySize || 500); // Use config size
    // Ensure terrain elements receive shadows
    if (terrain.primaryGround) terrain.primaryGround.receiveShadow = true;
    if (terrain.distantTerrain) terrain.distantTerrain.receiveShadow = true;
    if (terrain.horizonTerrain) terrain.horizonTerrain.receiveShadow = true; // Might not be necessary but won't hurt

    // Add distance mist for better horizon
    const mistLayers = createDistanceMist(scene, (config.citySize || 500) * 5, 60); // Adjust mist distance based on terrain

    // Create camera boundary controller using terrain bounds
    const boundaryController = new CameraBoundaryController(camera, controls, terrain.bounds);

    // Add grid for reference - 1m x 1m grid squares
    const gridHelper = new THREE.GridHelper(config.citySize || 500, (config.citySize || 500) / 10, 0x000000, 0x555555); // Adjust grid size
    gridHelper.position.y = 0.01; // Place slightly above ground
    // Grid doesn't typically receive or cast shadows, but could if needed:
    // gridHelper.receiveShadow = true;
    scene.add(gridHelper);

    // Hide grid by default
    gridHelper.visible = false;

    // Store grid reference globally for console access
    window.cityGrid = gridHelper;

    // Create building lots from cityData - Ensure plot outlines cast/receive shadows
    createBuildingLots(scene);

    // Update orbit controls settings
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5; // Adjusted min distance
    controls.maxDistance = (config.citySize || 500) * 0.7; // Limit max distance based on terrain size
    controls.maxPolarAngle = Math.PI / 2.1; // Allow slightly lower angle
    controls.enabled = false; // Disable controls during intro animation

    // Setup advanced lighting - use new function from dedicated file
    // Renderer passed to configure shadows inside setupSceneLighting
    setupSceneLighting(scene, renderer);

    // Call imported setup functions
    setupUIInteractions();
    setupConsolePanel();

    // Setup camera intro animation
    let introDuration = 4000; // 4 seconds for intro
    let introStartTime = Date.now();
    let introComplete = false;
    let audioFadeStarted = false;

    // Initialize plot hover info after the scene is ready
    initPlotHoverInfo(camera, scene, renderer);

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- Main Animation Loop ---
    function animate() {
        requestAnimationFrame(animate);

        // Check global drone state directly
        const isDroneActive = window.droneActive === true;

        // Handle intro camera animation
        if (!introComplete) {
            const elapsed = Date.now() - introStartTime;
            const progress = Math.min(elapsed / introDuration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

            if (progress < 1) {
                // Interpolate camera position for smooth pan
                const startPos = new THREE.Vector3(50, 30, 50);
                const endPos = new THREE.Vector3(15, 25, 30);
                camera.position.lerpVectors(startPos, endPos, easeProgress);
                camera.lookAt(0, 0, 0);
            } else {
                introComplete = true;
                if (!isDroneActive) controls.enabled = true; // Enable controls only if intro done AND drone inactive
            }
        } else if (!isDroneActive) { // Only update OrbitControls/boundaries if intro done AND drone inactive
            if (controls.enabled) { // Check if controls are enabled before updating
                controls.update();
                // Apply camera boundary restrictions
                boundaryController.update();
            }
        } else { // If drone is active, ensure OrbitControls are disabled
            // Camera is controlled by drone logic, but ensure OrbitControls internal state doesn't interfere
            controls.enabled = false;
            // Explicitly call update() maybe needed if drone logic relies on OrbitControls state? Test first.
            // controls.update(); // Might not be needed if drone directly manipulates camera/target
        }

        // Call animation functions for other components (like lighting)
        if (window.cityAnimateLightsFn) {
            window.cityAnimateLightsFn();
        }

        // Render the scene
        renderer.render(scene, camera);
    }

    animate(); // Start the main animation loop
}

function handleCityClick(event) {
    // Only handle clicks if drone is active
    if (!window.droneActive) return;

    // Ignore clicks if auto-navigation is already active
    if (window.isAutoNavigating) return;

    // Get mouse coordinates relative to the canvas
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast from the main camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Find all plot objects (outlines and click targets) in the scene
    const plotClickTargets = [];
    const plotOutlines = [];
    scene.traverse(obj => {
        if (obj.userData && obj.userData.type === 'lot_target' && obj.name === 'plot_click_target') {
            plotClickTargets.push(obj);
        } else if (obj.userData && obj.userData.type === 'lot' && obj.name === 'plot_outline') {
            plotOutlines.push(obj);
        }
    });

    // 1. Check intersections with invisible click targets first
    let intersects = raycaster.intersectObjects(plotClickTargets, false); // Don't check children

    let clickedPlotData = null;
    let clickedPlotId = null;

    if (intersects.length > 0) {
        // Found a hit on an invisible target plane
        clickedPlotId = intersects[0].object.userData.id;
        clickedPlotData = cityData.lots.find(lot => lot.id === clickedPlotId);
        console.log("Raycast hit invisible plot target:", clickedPlotData?.name);
    } else {
        // 2. Fallback: Check intersections with visible plot outlines (construction elements)
        intersects = raycaster.intersectObjects(plotOutlines, true); // recursive check
        if (intersects.length > 0) {
            let plotGroup = intersects[0].object;
            while (plotGroup && (!plotGroup.userData || plotGroup.userData.type !== 'lot')) {
                plotGroup = plotGroup.parent;
                if (!plotGroup) break;
            }

            if (plotGroup && plotGroup.userData && plotGroup.userData.id) {
                clickedPlotId = plotGroup.userData.id;
                clickedPlotData = cityData.lots.find(lot => lot.id === clickedPlotId);
                console.log("Raycast hit plot outline element:", clickedPlotData?.name);
            }
        }
    }

    // If a plot was clicked and it's available
    if (clickedPlotData && clickedPlotData.available) {
        console.log(`Plot clicked: ${clickedPlotData.name} (ID: ${clickedPlotData.id})`);

        // Calculate target position (center of the plot, slightly above ground)
        const targetX = clickedPlotData.x;
        const targetZ = clickedPlotData.z;
        const targetY = 5; // Target altitude above the plot

        const targetPosition = new THREE.Vector3(targetX, targetY, targetZ);

        // Call the drone's auto-navigation function
        startAutoNavigation(targetPosition, clickedPlotData.id);
    } else if (clickedPlotData && !clickedPlotData.available) {
        console.log(`Plot ${clickedPlotData.name} is occupied.`);
        // Optionally provide user feedback (e.g., temporary message)
    }
}

function createBuildingLots(scene) {
    const lots = cityData.lots;

    lots.forEach(lot => {
        // Create plot outline with construction elements
        const plotOutline = createPlotOutline(lot, scene); // This adds to scene internally
        plotOutline.userData = { type: 'lot', id: lot.id }; // Ensure userData is set here
        // Ensure the outline and its children cast/receive shadows
        plotOutline.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Create an invisible plane for click detection covering the plot area
        const clickTargetGeometry = new THREE.PlaneGeometry(lot.width, lot.height);
        const clickTargetMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Color doesn't matter as it's invisible
            side: THREE.DoubleSide,
            visible: false // Make it invisible
        });
        const clickTargetMesh = new THREE.Mesh(clickTargetGeometry, clickTargetMaterial);
        clickTargetMesh.rotation.x = -Math.PI / 2; // Lay flat on the ground
        clickTargetMesh.position.set(lot.x, 0.02, lot.z); // Position slightly above ground
        clickTargetMesh.name = 'plot_click_target';
        clickTargetMesh.userData = { type: 'lot_target', id: lot.id }; // Store plot ID

        scene.add(clickTargetMesh);

    });

    // Add city name text
    addCityNameText(scene);
}

function addCityNameText(scene) {
    // Create stone pillars
    const pillarGeometry = new THREE.BoxGeometry(1, 10, 1);
    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.2
    });

    // Left pillar
    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    leftPillar.position.set(-8, 5, -30);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true; // Pillars should receive shadows
    scene.add(leftPillar);

    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(8, 5, -30);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true; // Pillars should receive shadows
    scene.add(rightPillar);

    // Create text canvas for front and back
    const canvasWithText = document.createElement('canvas');
    canvasWithText.width = 512;
    canvasWithText.height = 128;
    const contextWithText = canvasWithText.getContext('2d');

    // Create blank canvas for sides
    const canvasBlank = document.createElement('canvas');
    canvasBlank.width = 512;
    canvasBlank.height = 128;
    const contextBlank = canvasBlank.getContext('2d');

    // Wood texture background for both canvases
    [contextWithText, contextBlank].forEach(context => {
        // Wood background
        context.fillStyle = '#8B4513';
        context.fillRect(0, 0, canvasWithText.width, canvasWithText.height);

        // Add wood grain effect
        context.strokeStyle = '#6B3100';
        context.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
            context.beginPath();
            context.moveTo(0, i * 15);
            context.bezierCurveTo(
                canvasWithText.width * 0.3, i * 15 + (Math.random() * 10 - 5),
                canvasWithText.width * 0.7, i * 15 + (Math.random() * 10 - 5),
                canvasWithText.width, i * 15
            );
            context.stroke();
        }
    });

    // Text with border - only on the text canvas
    contextWithText.fillStyle = 'white';
    contextWithText.font = 'bold 60px Arial';
    contextWithText.textAlign = 'center';
    contextWithText.textBaseline = 'middle';
    contextWithText.strokeStyle = 'black';
    contextWithText.lineWidth = 4;
    contextWithText.strokeText(cityData.name, canvasWithText.width / 2, canvasWithText.height / 2);
    contextWithText.fillText(cityData.name, canvasWithText.width / 2, canvasWithText.height / 2);

    // Create textures
    const textureWithText = new THREE.CanvasTexture(canvasWithText);
    const textureBlank = new THREE.CanvasTexture(canvasBlank);

    // Create materials for different sides
    const frontBackMaterial = new THREE.MeshStandardMaterial({ // Use Standard for lighting
        map: textureWithText,
        side: THREE.FrontSide,
        roughness: 0.7,
        metalness: 0.1
    });

    const sideMaterial = new THREE.MeshStandardMaterial({ // Use Standard for lighting
        map: textureBlank,
        side: THREE.FrontSide,
        roughness: 0.7,
        metalness: 0.1
    });

    // Create materials array for BoxGeometry
    const materials = [
        sideMaterial,       // right side
        sideMaterial,       // left side
        sideMaterial,       // top side
        sideMaterial,       // bottom side
        frontBackMaterial,  // front side
        frontBackMaterial   // back side (same as front)
    ];

    // Create box with different materials per face
    const geometry = new THREE.BoxGeometry(20, 5, 0.5);
    const sign = new THREE.Mesh(geometry, materials); // materials defined in existing code
    sign.position.set(0, 8.5, -30);
    sign.castShadow = true;
    sign.receiveShadow = true; // Sign should receive shadows
    scene.add(sign);
}

export function toggleConsolePanel() {
    const consolePanel = document.getElementById('console-panel');
    if (consolePanel.classList.contains('hidden')) {
        consolePanel.classList.remove('hidden');
    } else {
        consolePanel.classList.add('hidden');
    }
}