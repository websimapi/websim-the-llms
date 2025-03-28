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

// Expose main scene components globally or via getters for drone transport
let scene, camera, controls, renderer;
window.cityScene = scene; // Quick global access (consider a getter pattern later)
window.camera = camera;
window.controls = controls;
let mainAnimationId = null; // Store the main animation loop ID

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
        // Logarithmic depth buffer might cause issues with fog/transparency, disable if needed
        // logarithmicDepthBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimized pixel ratio
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadow mapping
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct property name for r152+
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Improved tone mapping
    renderer.toneMappingExposure = 1.2; // Adjust exposure for better lighting
    cityViewElement.appendChild(renderer.domElement);

    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement); // Assign to global variable
    window.controls = controls; // Update global reference

    // Create infinite terrain instead of just a ground plane
    const terrain = createInfiniteTerrain(scene, config.citySize || 500); // Use config size

    // Add distance mist for better horizon
    const mistLayers = createDistanceMist(scene, (config.citySize || 500) * 5, 60); // Adjust mist distance based on terrain

    // Create camera boundary controller using terrain bounds
    const boundaryController = new CameraBoundaryController(camera, controls, terrain.bounds);

    // Add grid for reference - 1m x 1m grid squares
    const gridHelper = new THREE.GridHelper(config.citySize || 500, (config.citySize || 500) / 10, 0x000000, 0x555555); // Adjust grid size
    gridHelper.position.y = 0.01; // Place slightly above ground
    scene.add(gridHelper);

    // Hide grid by default
    gridHelper.visible = false;

    // Store grid reference globally for console access
    window.cityGrid = gridHelper;

    // Create building lots from cityData
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
        // Always request the next frame
        mainAnimationId = requestAnimationFrame(animate);

        // Check global drone state directly
        // Use window.droneActive to check if drone mode is on
        const isDroneActive = window.droneActive === true;

        // Handle intro camera animation (only if drone is not active)
        if (!introComplete && !isDroneActive) {
            const elapsed = Date.now() - introStartTime;
            const progress = Math.min(elapsed / introDuration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

            if (progress < 1) {
                // Interpolate camera position for smooth pan
                const startPos = new THREE.Vector3(50, 30, 50);
                const endPos = new THREE.Vector3(15, 25, 30);
                camera.position.lerpVectors(startPos, endPos, easeProgress);
                camera.lookAt(0, 0, 0);
                // Ensure controls target is updated during intro
                controls.target.set(0, 0, 0);
                controls.update();
            } else {
                introComplete = true;
                controls.enabled = true; // Enable controls only when intro done AND drone inactive
            }
        } else if (!isDroneActive) { // If intro done OR skipped, AND drone inactive
            if (controls.enabled) { // Check if controls are enabled before updating
                controls.update();
                // Apply camera boundary restrictions
                boundaryController.update();
            }
        }
        // Note: Camera movement during drone mode is handled by llmDroneTransport.js

        // Call animation functions for other components (like lighting)
        if (window.cityAnimateLightsFn) {
            window.cityAnimateLightsFn();
        }

        // Render the scene only if the renderer exists
        if (renderer) {
             renderer.render(scene, camera);
        }
    }

    // Cancel previous animation frame if exists
    if (mainAnimationId) {
        cancelAnimationFrame(mainAnimationId);
    }
    animate(); // Start the main animation loop
}

function createBuildingLots(scene) {
    const lots = cityData.lots;

    lots.forEach(lot => {
        // Create plot outline with construction elements instead of box geometry
        const plotOutline = createPlotOutline(lot, scene);
        plotOutline.userData = { type: 'lot', id: lot.id };

        // No need to add to scene as createPlotOutline already does this
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
    leftPillar.receiveShadow = true;
    scene.add(leftPillar);

    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(8, 5, -30);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
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
    const sign = new THREE.Mesh(geometry, materials);
    sign.position.set(0, 8.5, -30);
    sign.castShadow = true;
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

// Function to cleanup the scene if needed (e.g., on full reload/reset)
export function cleanupCityScene() {
    if (mainAnimationId) {
        cancelAnimationFrame(mainAnimationId);
        mainAnimationId = null;
    }
    // TODO: Add disposal of scene objects, renderer, controls if needed
    console.log("City scene animation stopped.");
}