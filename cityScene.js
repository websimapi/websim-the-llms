import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { config } from './config.js';
import { cityData } from './cityData.js';
import { setupCityLighting, setupShadows, setupPostProcessing } from './cityLightingEffects.js';

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
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0f5e0);
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
        60, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
    );
    
    // Set initial camera position further out for cinematic intro
    camera.position.set(50, 30, 50);
    camera.lookAt(0, 0, 0);
    
    // Setup improved renderer settings
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    cityViewElement.appendChild(renderer.domElement);
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2.5;
    controls.enabled = false; // Disable controls during intro animation
    
    // Setup enhanced lighting using our new module
    const lighting = setupCityLighting(scene);
    
    // Create ground plane with improved texture
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 64, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7cfc00,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add grid for reference
    const gridHelper = new THREE.GridHelper(100, 100, 0x000000, 0x555555);
    scene.add(gridHelper);
    
    // Create building lots from cityData
    createBuildingLots(scene);
    
    // Apply shadows to all objects
    setupShadows(scene);
    
    // Setup post-processing for better visual quality
    const postProcessing = setupPostProcessing(scene, camera, renderer);
    
    // Setup console toggling
    setupConsoleToggle();
    
    // Setup camera intro animation
    let introDuration = 4000; // 4 seconds for intro
    let introStartTime = Date.now();
    let introComplete = false;
    let audioFadeStarted = false;
    
    // Setup UI event listeners
    setupUIInteractions();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update post-processing on resize if available
        if (postProcessing.resize) {
            postProcessing.resize(window.innerWidth, window.innerHeight);
        }
    });
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Handle intro camera animation
        if (!introComplete) {
            const elapsed = Date.now() - introStartTime;
            const progress = Math.min(elapsed / introDuration, 1);
            
            if (progress < 1) {
                // Interpolate camera position for smooth pan
                const targetX = 15; // Increased from 0 to stay further out
                const targetY = 25; // Increased from 20
                const targetZ = 30; // Increased from 20 to maintain more distance
                
                camera.position.x = 50 * (1 - progress) + targetX * progress;
                camera.position.y = 30 * (1 - progress) + targetY * progress;
                camera.position.z = 50 * (1 - progress) + targetZ * progress;
                camera.lookAt(0, 0, 0);
                
                // Start fading audio halfway through the animation
                if (progress > 0.3 && !audioFadeStarted) {
                    audioFadeStarted = true;
                    
                    // Use the new music player module
                    import('./musicPlayer.js').then(module => {
                        module.fadeOutMusic(3000);
                    });
                }
            } else {
                introComplete = true;
                controls.enabled = true; // Enable controls after intro
            }
        } else {
            controls.update();
            
            // Update lighting based on time
            const time = Date.now() * 0.001;
            lighting.updateLighting(time);
        }
        
        // Use post-processing render if available, otherwise use standard renderer
        if (postProcessing && postProcessing.render) {
            postProcessing.render();
        } else {
            renderer.render(scene, camera);
        }
    }
    
    animate();
}

function setupUIInteractions() {
    const createLLMButton = document.querySelector('.create-llm-btn');
    
    createLLMButton.addEventListener('click', () => {
        console.log('Create new LLM clicked');
        // Implementation for creating new LLM will go here
    });
}

function createBuildingLots(scene) {
    const lots = cityData.lots;
    
    lots.forEach(lot => {
        // Create a lot as a raised platform with improved materials
        const lotGeometry = new THREE.BoxGeometry(lot.width, 0.2, lot.height);
        const lotMaterial = new THREE.MeshStandardMaterial({ 
            color: lot.available ? 0xffeb3b : 0xbdbdbd,
            roughness: 0.7,
            metalness: 0.2,
            emissive: lot.available ? 0x554400 : 0x111111,
            emissiveIntensity: 0.1
        });
        
        const lotMesh = new THREE.Mesh(lotGeometry, lotMaterial);
        lotMesh.position.set(lot.x, 0.1, lot.z);
        lotMesh.receiveShadow = true;
        lotMesh.castShadow = true;
        lotMesh.userData = { type: 'lot', id: lot.id };
        scene.add(lotMesh);
        
        // Add a wireframe outline
        const wireframeGeometry = new THREE.EdgesGeometry(lotGeometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        wireframe.position.copy(lotMesh.position);
        scene.add(wireframe);
        
        // Add a point light above each available lot for highlighting
        if (lot.available) {
            const pointLight = new THREE.PointLight(0xffeb3b, 0.3, 10);
            pointLight.position.set(lot.x, 1.5, lot.z);
            scene.add(pointLight);
        }
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
    const frontBackMaterial = new THREE.MeshBasicMaterial({
        map: textureWithText,
        side: THREE.FrontSide
    });
    
    const sideMaterial = new THREE.MeshBasicMaterial({
        map: textureBlank,
        side: THREE.FrontSide
    });
    
    // Create materials array for BoxGeometry
    const materials = [
        sideMaterial,       // right side
        sideMaterial,       // left side
        sideMaterial,       // top side
        sideMaterial,       // bottom side
        frontBackMaterial,  // front side
        frontBackMaterial   // back side
    ];
    
    // Create box with different materials per face
    const geometry = new THREE.BoxGeometry(20, 5, 0.5);
    const sign = new THREE.Mesh(geometry, materials);
    sign.position.set(0, 8.5, -30);
    sign.castShadow = true;
    scene.add(sign);
}

function setupConsoleToggle() {
    document.addEventListener('keydown', (event) => {
        if (event.key === '`' || event.key === '~') {
            toggleConsolePanel();
        }
    });
}

function toggleConsolePanel() {
    const consolePanel = document.getElementById('console-panel');
    if (consolePanel.classList.contains('hidden')) {
        consolePanel.classList.remove('hidden');
    } else {
        consolePanel.classList.add('hidden');
    }
}