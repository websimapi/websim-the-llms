// New enhanced city scene file with HD realistic rendering
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { config } from './config.js';
import { cityData } from './cityData.js';
import { setupEnvironment, stopDayNightCycle, setTimeOfDay } from './cityEnvironment.js';

// Improved materials and textures for realistic look
const materials = {
    ground: new THREE.MeshStandardMaterial({
        color: 0x7cfc00,
        roughness: 0.8,
        metalness: 0.2,
        flatShading: false
    }),
    wood: new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.9,
        metalness: 0.1
    }),
    stone: new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.2
    }),
    lot: {
        available: new THREE.MeshStandardMaterial({
            color: 0xffeb3b,
            roughness: 0.7,
            metalness: 0.2,
            transparent: true,
            opacity: 0.9
        }),
        unavailable: new THREE.MeshStandardMaterial({
            color: 0xbdbdbd,
            roughness: 0.7,
            metalness: 0.2,
            transparent: true,
            opacity: 0.9
        })
    }
};

let scene, camera, renderer, controls;
let cityGroup, citySign;

export function initEnhancedCityScene() {
    const cityViewElement = document.getElementById('city-view');
    
    // Initialize Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0f5e0);
    
    // Enable HDR rendering and improved shadow quality
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Balance quality and performance
    cityViewElement.appendChild(renderer.domElement);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(
        60, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        2000
    );
    
    // Set initial camera position further out for cinematic intro
    camera.position.set(50, 30, 50);
    camera.lookAt(0, 0, 0);
    
    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2.2; // Prevent going below ground
    controls.enabled = false; // Disable controls during intro animation
    
    // Create a group for city elements
    cityGroup = new THREE.Group();
    scene.add(cityGroup);
    
    // Setup environment (sky, water, terrain)
    setupEnvironment(scene, renderer);
    
    // Add lights
    addRealisticLighting();
    
    // Create city elements
    createBuildingLots();
    createCitySign();
    
    // Add post-processing effects
    setupPostProcessing();
    
    // Setup camera intro animation
    setupCameraIntro();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Animation loop
    animate();
}

function addRealisticLighting() {
    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    
    // Improve shadow quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.bias = -0.001;
    
    // Adjust shadow camera to cover scene properly
    const shadowSize = 50;
    directionalLight.shadow.camera.left = -shadowSize;
    directionalLight.shadow.camera.right = shadowSize;
    directionalLight.shadow.camera.top = shadowSize;
    directionalLight.shadow.camera.bottom = -shadowSize;
    
    scene.add(directionalLight);
    
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add subtle hemisphere light for more realistic ambient lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5f0b, 0.3);
    scene.add(hemisphereLight);
}

function createBuildingLots() {
    const lots = cityData.lots;
    
    lots.forEach(lot => {
        // Create a lot as a raised platform with realistic material
        const lotGeometry = new THREE.BoxGeometry(lot.width, 0.2, lot.height);
        const lotMaterial = lot.available ? materials.lot.available : materials.lot.unavailable;
        
        const lotMesh = new THREE.Mesh(lotGeometry, lotMaterial);
        lotMesh.position.set(lot.x, 0.1, lot.z);
        lotMesh.receiveShadow = true;
        lotMesh.castShadow = true;
        lotMesh.userData = { type: 'lot', id: lot.id };
        cityGroup.add(lotMesh);
        
        // Add a wireframe outline
        const wireframeGeometry = new THREE.EdgesGeometry(lotGeometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000,
            linewidth: 2
        });
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        wireframe.position.copy(lotMesh.position);
        cityGroup.add(wireframe);
        
        // Add subtle inner platform to give depth
        const innerGeometry = new THREE.BoxGeometry(lot.width - 0.5, 0.1, lot.height - 0.5);
        const innerMesh = new THREE.Mesh(innerGeometry, lotMaterial.clone());
        innerMesh.material.color.multiplyScalar(1.1); // Slightly brighter
        innerMesh.position.set(lot.x, 0.25, lot.z);
        innerMesh.receiveShadow = true;
        cityGroup.add(innerMesh);
    });
}

function createCitySign() {
    // Define materials at the top of the function
    const materials = {
        stone: new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2
        })
    };
    
    // Create stone pillars with realistic texture
    const pillarGeometry = new THREE.BoxGeometry(1, 10, 1);
    
    // Get stone texture for pillars
    const stoneTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/brick_diffuse.jpg');
    stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping;
    stoneTexture.repeat.set(1, 4);
    
    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.2,
        map: stoneTexture
    });
    
    // Left pillar
    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    leftPillar.position.set(-8, 5, -30);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    cityGroup.add(leftPillar);
    
    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(8, 5, -30);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    cityGroup.add(rightPillar);
    
    // Create sign board textures - one with text, one without
    const signWidth = 512;
    const signHeight = 128;
    
    // Create text canvas for front and back
    const canvasWithText = document.createElement('canvas');
    canvasWithText.width = signWidth;
    canvasWithText.height = signHeight;
    const contextWithText = canvasWithText.getContext('2d');
    
    // Create wood texture for sign
    const woodTexture = createWoodTexture(signWidth, signHeight);
    
    // Apply the wood texture to front/back
    contextWithText.drawImage(woodTexture, 0, 0);
    
    // Add text with border to front/back
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
    const textureBlank = new THREE.CanvasTexture(woodTexture);
    
    // Create materials for different sides
    const frontBackMaterial = new THREE.MeshStandardMaterial({
        map: textureWithText,
        roughness: 0.8,
        metalness: 0.1,
        bumpMap: textureWithText,
        bumpScale: 0.05
    });
    
    const sideMaterial = new THREE.MeshStandardMaterial({
        map: textureBlank,
        roughness: 0.8,
        metalness: 0.1,
        bumpMap: textureBlank,
        bumpScale: 0.05
    });
    
    // Create materials array for BoxGeometry
    const signMaterials = [
        sideMaterial,       // right side
        sideMaterial,       // left side
        sideMaterial,       // top side
        sideMaterial,       // bottom side
        frontBackMaterial,  // front side
        frontBackMaterial   // back side
    ];
    
    // Create box with different materials per face
    const geometry = new THREE.BoxGeometry(20, 5, 0.5);
    citySign = new THREE.Mesh(geometry, signMaterials);
    citySign.position.set(0, 8.5, -80); 
    citySign.castShadow = true;
    citySign.receiveShadow = true;
    cityGroup.add(citySign);
    
    // Add support beams
    addSignSupports();
}

function createWoodTexture(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    
    // Wood background
    context.fillStyle = '#8B4513';
    context.fillRect(0, 0, width, height);
    
    // Add wood grain effect
    context.strokeStyle = '#6B3100';
    context.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
        context.beginPath();
        context.moveTo(0, i * 15);
        context.bezierCurveTo(
            width * 0.3, i * 15 + (Math.random() * 10 - 5),
            width * 0.7, i * 15 + (Math.random() * 10 - 5),
            width, i * 15
        );
        context.stroke();
    }
    
    // Add some knots in the wood
    for (let i = 0; i < 3; i++) {
        const knotX = Math.random() * width;
        const knotY = Math.random() * height;
        const knotSize = 5 + Math.random() * 10;
        
        const gradient = context.createRadialGradient(
            knotX, knotY, 0, knotX, knotY, knotSize
        );
        
        gradient.addColorStop(0, '#5D3A1A');
        gradient.addColorStop(1, '#8B4513');
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(knotX, knotY, knotSize, 0, Math.PI * 2);
        context.fill();
    }
    
    return canvas;
}

function addSignSupports() {
    // Add wooden supports connecting the sign to the pillars
    const supportGeometry = new THREE.BoxGeometry(3, 0.5, 0.5);
    const supportMaterial = materials.wood;
    
    // Left support
    const leftSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    leftSupport.position.set(-6.5, 8.5, -30);
    leftSupport.castShadow = true;
    leftSupport.receiveShadow = true;
    cityGroup.add(leftSupport);
    
    // Right support
    const rightSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    rightSupport.position.set(6.5, 8.5, -30);
    rightSupport.castShadow = true;
    rightSupport.receiveShadow = true;
    cityGroup.add(rightSupport);
}

function setupPostProcessing() {
    // Add soft shadows and ambient occlusion
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

function setupCameraIntro() {
    // Setup camera intro animation
    let introDuration = 8000; 
    let introStartTime = Date.now();
    let introComplete = false;
    let audioFadeStarted = false;
    
    // Smoother, more cinematic camera path - adjusted for new terrain layout
    const cameraPathPoints = [
        new THREE.Vector3(80, 60, 180),   
        new THREE.Vector3(60, 50, 120),   
        new THREE.Vector3(40, 40, 80),    
        new THREE.Vector3(20, 30, 40),    
        new THREE.Vector3(0, 25, 20),     
        new THREE.Vector3(0, 22, -20),    
        new THREE.Vector3(15, 22, 15)     
    ];
    
    // Create a smooth curve through these points
    const curve = new THREE.CatmullRomCurve3(cameraPathPoints);
    
    // Handle intro animation in the animate loop
    window.cameraIntroData = {
        startTime: introStartTime,
        duration: introDuration,
        complete: introComplete,
        audioFadeStarted: audioFadeStarted,
        curve: curve
    };
}

function animate() {
    requestAnimationFrame(animate);
    
    // Handle intro camera animation
    if (window.cameraIntroData && !window.cameraIntroData.complete) {
        const elapsed = Date.now() - window.cameraIntroData.startTime;
        const progress = Math.min(elapsed / window.cameraIntroData.duration, 1);
        
        if (progress < 1) {
            // Get position along curve
            const point = window.cameraIntroData.curve.getPoint(progress);
            camera.position.copy(point);
            camera.lookAt(0, 0, 0);
            
            // Start fading audio halfway through the animation
            if (progress > 0.3 && !window.cameraIntroData.audioFadeStarted) {
                window.cameraIntroData.audioFadeStarted = true;
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
            window.cameraIntroData.complete = true;
            controls.enabled = true; // Enable controls after intro
        }
    } else {
        // Normal orbit controls update
        controls.update();
    }
    
    // Animate the city sign
    if (citySign) {
        citySign.rotation.y = Math.sin(Date.now() * 0.0005) * 0.03; // Subtle wobble
    }
    
    renderer.render(scene, camera);
}