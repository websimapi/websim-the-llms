import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { config } from './config.js';
import { cityData } from './cityData.js';
import { setupSceneLighting } from './advancedLighting.js';

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
    camera.position.set(80, 40, 80); 
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance",
        logarithmicDepthBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    renderer.outputEncoding = THREE.sRGBEncoding; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping; 
    renderer.toneMappingExposure = 1.2; 
    cityViewElement.appendChild(renderer.domElement);
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2.5;
    controls.enabled = false; 
    
    // Setup advanced lighting - use new function from dedicated file
    setupSceneLighting(scene, renderer);
    
    // Create ground plane - increased size
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7cfc00,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add grid for reference - increased size
    const gridHelper = new THREE.GridHelper(500, 100, 0x000000, 0x555555);
    scene.add(gridHelper);
    
    // Create terrain in the background with added details
    import('./terrainGenerator.js').then(module => {
        const terrain = module.generateTerrain(scene);
        scene.add(terrain);
        
        // Add enhanced ground details
        import('./enhancedTerrainUtils.js').then(enhancedModule => {
            enhancedModule.enhanceGroundDetail(scene, ground);
        });
    });
    
    // Create building lots from cityData with more spread
    createBuildingLots(scene);
    
    // Setup console toggling
    setupConsoleToggle();
    
    // Setup camera intro animation
    let introDuration = 4000; 
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
                const targetX = 25; 
                const targetY = 30; 
                const targetZ = 45; 
                
                camera.position.x = 80 * (1 - progress) + targetX * progress;
                camera.position.y = 40 * (1 - progress) + targetY * progress;
                camera.position.z = 80 * (1 - progress) + targetZ * progress;
                camera.lookAt(0, 0, 0);
                
                /*
                if (progress > 0.3 && !audioFadeStarted) {
                    audioFadeStarted = true;
                    
                    // Use the new music player module
                    import('./musicPlayer.js').then(module => {
                        module.fadeOutMusic(3000);
                    });
                }
                */
            } else {
                introComplete = true;
                controls.enabled = true; 
            }
        } else {
            controls.update();
        }
        
        renderer.render(scene, camera);
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
    // Create a modified copy of lots with expanded spacing
    const expandedLots = cityData.lots.map(lot => {
        return {
            ...lot,
            x: lot.x * 3, 
            z: lot.z * 3, 
            width: lot.width * 1.5, 
            height: lot.height * 1.5
        };
    });
    
    // Add some additional lots in more distant areas - avoid sign area (z from -70 to -30)
    const additionalLots = [
        { id: 8, name: "North Outpost", width: 12, height: 12, x: -60, z: -100, available: true, type: "residential" },
        { id: 9, name: "East Outpost", width: 14, height: 14, x: 60, z: -100, available: true, type: "commercial" },
        { id: 10, name: "South Research", width: 15, height: 10, x: -40, z: 70, available: true, type: "research" },
        { id: 11, name: "West Heights", width: 12, height: 12, x: 70, z: 60, available: true, type: "residential" },
        { id: 12, name: "Central Tower", width: 20, height: 20, x: 0, z: -110, available: true, type: "commercial" },
        // Additional distant plots
        { id: 13, name: "North Hills", width: 18, height: 14, x: -90, z: -130, available: true, type: "residential" },
        { id: 14, name: "East Valley", width: 16, height: 16, x: 90, z: -80, available: true, type: "commercial" },
        { id: 15, name: "Southern Meadows", width: 14, height: 12, x: -70, z: 100, available: true, type: "residential" },
        { id: 16, name: "Western Plains", width: 15, height: 15, x: 100, z: 90, available: true, type: "research" }
    ];
    
    // Combine original expanded lots with additional lots
    const allLots = [...expandedLots, ...additionalLots];
    
    // Filter out any lots that are too close to the sign (z between -70 and -30)
    const filteredLots = allLots.filter(lot => {
        // Keep lots that aren't in the sign area
        const minZ = lot.z - lot.height/2;
        const maxZ = lot.z + lot.height/2;
        
        // Sign is at z = -60, so create a safe zone around it
        const signZMin = -75;
        const signZMax = -40;
        
        // Return true if lot doesn't overlap with sign area
        return !(minZ <= signZMax && maxZ >= signZMin && Math.abs(lot.x) < 30);
    });
    
    // Create visual representation of all lots
    filteredLots.forEach(lot => {
        // Create a lot as a raised platform
        const lotGeometry = new THREE.BoxGeometry(lot.width, 0.2, lot.height);
        const lotMaterial = new THREE.MeshStandardMaterial({ 
            color: lot.available ? 0xffeb3b : 0xbdbdbd,
            roughness: 0.7,
            metalness: 0.2
        });
        
        const lotMesh = new THREE.Mesh(lotGeometry, lotMaterial);
        lotMesh.position.set(lot.x, 0.1, lot.z);
        lotMesh.receiveShadow = true;
        lotMesh.userData = { type: 'lot', id: lot.id };
        scene.add(lotMesh);
        
        // Add a wireframe outline
        const wireframeGeometry = new THREE.EdgesGeometry(lotGeometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        wireframe.position.copy(lotMesh.position);
        scene.add(wireframe);
    });
    
    // Add city name text - moved further away
    addCityNameText(scene, 0, 5, -60); 
}

function addCityNameText(scene, x = 0, y = 5, z = -60) {
    // Create larger, more ornate stone pillars
    const pillarGeometry = new THREE.BoxGeometry(2, 15, 2);
    const pillarMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.2
    });
    
    // Left pillar
    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    leftPillar.position.set(x - 15, y, z);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    scene.add(leftPillar);
    
    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(x + 15, y, z);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    scene.add(rightPillar);
    
    // Add decorative pillar tops
    const capGeometry = new THREE.BoxGeometry(3, 1.5, 3);
    const capMaterial = new THREE.MeshStandardMaterial({
        color: 0x707070,
        roughness: 0.7,
        metalness: 0.3
    });
    
    // Left cap
    const leftCap = new THREE.Mesh(capGeometry, capMaterial);
    leftCap.position.set(x - 15, y + 8, z);
    leftCap.castShadow = true;
    leftCap.receiveShadow = true;
    scene.add(leftCap);
    
    // Right cap
    const rightCap = new THREE.Mesh(capGeometry, capMaterial);
    rightCap.position.set(x + 15, y + 8, z);
    rightCap.castShadow = true;
    rightCap.receiveShadow = true;
    scene.add(rightCap);
    
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
        
        // Add wood grain effect with more variation
        context.strokeStyle = '#6B3100';
        context.lineWidth = 2;
        for (let i = 0; i < 15; i++) {
            context.beginPath();
            context.moveTo(0, i * 10);
            context.bezierCurveTo(
                canvasWithText.width * 0.3, i * 10 + (Math.random() * 15 - 7),
                canvasWithText.width * 0.7, i * 10 + (Math.random() * 15 - 7),
                canvasWithText.width, i * 10
            );
            context.stroke();
        }
    });
    
    // Text with border and enhanced styling
    contextWithText.fillStyle = 'white';
    contextWithText.font = 'bold 60px Arial';
    contextWithText.textAlign = 'center';
    contextWithText.textBaseline = 'middle';
    
    // Add text shadow for depth
    contextWithText.shadowColor = 'rgba(0, 0, 0, 0.6)';
    contextWithText.shadowBlur = 10;
    contextWithText.shadowOffsetX = 4;
    contextWithText.shadowOffsetY = 4;
    
    // Text outline
    contextWithText.strokeStyle = 'black';
    contextWithText.lineWidth = 4;
    contextWithText.strokeText(cityData.name, canvasWithText.width / 2, canvasWithText.height / 2);
    
    // Text fill
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
        sideMaterial,       
        sideMaterial,       
        sideMaterial,       
        sideMaterial,       
        frontBackMaterial,  
        frontBackMaterial   
    ];
    
    // Create larger sign
    const geometry = new THREE.BoxGeometry(35, 8, 0.6);
    const sign = new THREE.Mesh(geometry, materials);
    sign.position.set(x, y + 5, z); // Raised higher
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