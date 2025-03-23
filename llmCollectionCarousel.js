import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';
import { llmDataManager } from './llmDataManager.js';

let carouselScene, carouselCamera, carouselRenderer;
let carouselModels = [];
let currentIndex = 0;
let animationId;
let totalLLMs = 0;

export function initCarouselView(viewport, llms) {
    // Cancel any existing animation
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Clear the viewport
    viewport.innerHTML = '';
    
    // Store total LLM count
    totalLLMs = llms.length;
    
    // Setup scene
    carouselScene = new THREE.Scene();
    carouselScene.background = new THREE.Color(0x111111);
    
    // Setup camera
    carouselCamera = new THREE.PerspectiveCamera(45, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
    carouselCamera.position.set(0, 1.5, 5);
    carouselCamera.lookAt(0, 1, 0);
    
    // Setup renderer
    carouselRenderer = new THREE.WebGLRenderer({ antialias: true });
    carouselRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    carouselRenderer.shadowMap.enabled = true;
    viewport.appendChild(carouselRenderer.domElement);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    carouselScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 5, 3);
    directionalLight.castShadow = true;
    carouselScene.add(directionalLight);
    
    // Add floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.y = -1;
    carouselScene.add(floor);
    
    // Create models
    createCarouselModels(llms);
    
    // Update position to show first 3 models
    updateCarouselPosition();
    
    // Start animation
    animateCarousel();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (carouselCamera && carouselRenderer && viewport) {
            carouselCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            carouselCamera.updateProjectionMatrix();
            carouselRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    });
    
    return {
        nextItem: () => navigateCarousel(1),
        prevItem: () => navigateCarousel(-1),
        getCurrentLLM: () => llms[currentIndex],
        cleanup: () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        }
    };
}

function createCarouselModels(llms) {
    // Clear existing models
    carouselModels = [];
    
    // Create a model for each LLM
    llms.forEach(llm => {
        let model;
        
        if (llm.customCharacterCode) {
            try {
                model = createCustomCharacter(THREE, llm.customCharacterCode);
            } catch (error) {
                console.error("Error creating custom character:", error);
                model = createFallbackModel(llm);
            }
        } else {
            model = createStandardModel(llm);
        }
        
        // Store reference to source LLM
        model.userData = { id: llm.id };
        
        // Hide all models initially
        model.visible = false;
        carouselScene.add(model);
        carouselModels.push(model);
    });
}

function createStandardModel(llm) {
    // Create a simple robot model based on the LLM properties
    const group = new THREE.Group();
    
    const color = new THREE.Color(llm.color || 0x3cb371);
    
    // Create head
    const headMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color.clone().multiplyScalar(0.3),
        metalness: 0.7,
        roughness: 0.3
    });
    
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        headMaterial
    );
    head.position.y = 1.8;
    group.add(head);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 1.85, 0.2);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 1.85, 0.2);
    group.add(rightEye);
    
    // Create body
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: color.clone().multiplyScalar(0.8),
        metalness: 0.5,
        roughness: 0.5
    });
    
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.3),
        bodyMaterial
    );
    body.position.y = 1.2;
    group.add(body);
    
    // Create simple limbs
    const limbsMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Add simple arms and legs
    const arms = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.2, 0.2),
        limbsMaterial
    );
    arms.position.y = 1.3;
    group.add(arms);
    
    const legs = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.15, 1),
        limbsMaterial
    );
    legs.position.y = 0.5;
    group.add(legs);
    
    return group;
}

function createFallbackModel(llm) {
    // Very simple fallback model
    const group = new THREE.Group();
    
    const color = new THREE.Color(llm.color || 0x3cb371);
    
    // Create body
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 1.7),
        new THREE.MeshStandardMaterial({ color })
    );
    body.position.y = 0.85;
    group.add(body);
    
    // Add a nameplate
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(llm.name, canvas.width / 2, canvas.height / 2 + 8);
    
    const texture = new THREE.CanvasTexture(canvas);
    const nameMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true
    });
    
    const nameplate = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 0.25),
        nameMaterial
    );
    nameplate.position.set(0, 2, 0);
    nameplate.rotation.y = Math.PI;
    group.add(nameplate);
    
    return group;
}

function navigateCarousel(direction) {
    currentIndex = (currentIndex + direction + totalLLMs) % totalLLMs;
    updateCarouselPosition();
    
    // Return the current model id
    return carouselModels[currentIndex].userData.id;
}

function updateCarouselPosition() {
    // Show the current and adjacent models (3 total)
    carouselModels.forEach((model, index) => {
        // Calculate relative position (-1, 0, or 1)
        const relativePos = ((index - currentIndex + totalLLMs) % totalLLMs);
        
        // Only show models in the current view (current and adjacent)
        if (relativePos < 3 && (relativePos === 0 || relativePos === 1 || relativePos === totalLLMs - 1)) {
            model.visible = true;
            
            // Position based on relative position
            if (relativePos === 0) { // Current model
                model.position.set(0, 0, 0);
                model.rotation.y = 0;
            } else if (relativePos === 1) { // Next model
                model.position.set(3, 0, -1);
                model.rotation.y = -Math.PI / 4;
            } else { // Previous model
                model.position.set(-3, 0, -1);
                model.rotation.y = Math.PI / 4;
            }
        } else {
            model.visible = false;
        }
    });
}

function animateCarousel() {
    if (!carouselScene || !carouselCamera || !carouselRenderer) return;
    
    animationId = requestAnimationFrame(animateCarousel);
    
    // Add subtle animation to the models
    carouselModels.forEach((model, index) => {
        if (model.visible) {
            const time = Date.now() * 0.001;
            model.position.y = Math.sin(time + index) * 0.1;
        }
    });
    
    carouselRenderer.render(carouselScene, carouselCamera);
}