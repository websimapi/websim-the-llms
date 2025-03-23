import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { config } from './config.js';
import { cityData } from './cityData.js';

document.addEventListener('DOMContentLoaded', () => {
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
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
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
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
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
                    const audio = document.querySelector('audio');
                    if (audio) {
                        // Access the fadeOutAudio function from the window object
                        if (typeof window.fadeOutAudio === 'function') {
                            window.fadeOutAudio(3000);
                        } else {
                            // Fallback if function isn't available
                            audio.volume = 0;
                        }
                    }
                }
            } else {
                introComplete = true;
                controls.enabled = true; // Enable controls after intro
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
    const lots = cityData.lots;
    
    lots.forEach(lot => {
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
    
    // Create sign board
    const loader = new THREE.TextureLoader();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    // Wood texture background
    context.fillStyle = '#8B4513';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add wood grain effect
    context.strokeStyle = '#6B3100';
    context.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
        context.beginPath();
        context.moveTo(0, i * 15);
        context.bezierCurveTo(
            canvas.width * 0.3, i * 15 + (Math.random() * 10 - 5),
            canvas.width * 0.7, i * 15 + (Math.random() * 10 - 5),
            canvas.width, i * 15
        );
        context.stroke();
    }
    
    // Text with border
    context.fillStyle = 'white';
    context.font = 'bold 60px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.strokeStyle = 'black';
    context.lineWidth = 4;
    context.strokeText(cityData.name, canvas.width / 2, canvas.height / 2);
    context.fillText(cityData.name, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: false,
        side: THREE.DoubleSide
    });
    
    const geometry = new THREE.BoxGeometry(20, 5, 0.5);
    const sign = new THREE.Mesh(geometry, material);
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