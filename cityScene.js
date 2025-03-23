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
    camera.position.set(0, 20, 20);
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
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Setup UI event listeners
    setupUIInteractions();
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
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
    const loader = new THREE.TextureLoader();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#3cb371';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.font = 'bold 60px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(cityData.name, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const geometry = new THREE.PlaneGeometry(20, 5);
    const sign = new THREE.Mesh(geometry, material);
    sign.position.set(0, 5, -30);
    sign.rotation.x = -Math.PI / 10;
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