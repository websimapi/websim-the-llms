import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';
import { llmDataManager } from './llmDataManager.js';

let carouselScene, carouselCamera, carouselRenderer;
let carouselModels = [];
let currentStartIndex = 0;
let totalLLMs = 0;
let carouselAnimationId;

export function setupLLMCarouselView(viewport) {
    // Clear existing content
    viewport.innerHTML = '';
    
    // Cancel any existing animation
    if (carouselAnimationId) {
        cancelAnimationFrame(carouselAnimationId);
    }
    
    // Get all LLMs
    const llms = llmDataManager.getAllLLMs();
    totalLLMs = llms.length;
    
    if (totalLLMs === 0) {
        // Show empty state message
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-carousel';
        emptyMessage.innerHTML = '<p>No LLMs to display</p>';
        viewport.appendChild(emptyMessage);
        return;
    }
    
    // Setup Three.js scene
    initCarouselScene(viewport);
    
    // Update the carousel with initial models
    updateCarouselModels(llms);
    
    // Setup navigation arrows
    setupCarouselNavigation(viewport, llms);
}

function initCarouselScene(viewport) {
    // Setup scene
    carouselScene = new THREE.Scene();
    carouselScene.background = new THREE.Color(0x111111);
    
    // Setup camera
    carouselCamera = new THREE.PerspectiveCamera(
        45, 
        viewport.clientWidth / viewport.clientHeight, 
        0.1, 
        1000
    );
    carouselCamera.position.set(0, 1.7, 6);
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
    directionalLight.position.set(5, 5, 5);
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
    
    // Handle resize
    window.addEventListener('resize', () => {
        if (carouselCamera && carouselRenderer && viewport) {
            carouselCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            carouselCamera.updateProjectionMatrix();
            carouselRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    });
    
    // Start animation
    animateCarousel();
}

function updateCarouselModels(llms) {
    // Remove existing models
    carouselModels.forEach(model => {
        if (model && model.parent) {
            model.parent.remove(model);
        }
    });
    carouselModels = [];
    
    // Determine which LLMs to show (3 at a time)
    const displayCount = Math.min(3, totalLLMs);
    
    // Calculate positions for models
    const spacing = 2.5; // Space between models
    const startX = -spacing * (displayCount - 1) / 2;
    
    // Create and position models
    for (let i = 0; i < displayCount; i++) {
        const llmIndex = (currentStartIndex + i) % totalLLMs;
        const llm = llms[llmIndex];
        
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
        
        // Position model
        model.position.set(startX + i * spacing, 0, 0);
        model.userData = { id: llm.id, index: llmIndex };
        
        carouselScene.add(model);
        carouselModels.push(model);
        
        // Add nameplate
        addNameplate(llm.name, startX + i * spacing, model);
    }
}

function addNameplate(name, xPosition, model) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add border
    ctx.strokeStyle = '#3cb371';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Add text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const nameplate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.4),
        material
    );
    nameplate.position.set(0, 2.3, 0);
    nameplate.rotation.x = -0.2;
    model.add(nameplate);
}

function setupCarouselNavigation(viewport, llms) {
    // Create left arrow
    const leftArrow = document.createElement('div');
    leftArrow.className = 'carousel-arrow left-arrow';
    leftArrow.innerHTML = '&lt;';
    viewport.appendChild(leftArrow);
    
    // Create right arrow
    const rightArrow = document.createElement('div');
    rightArrow.className = 'carousel-arrow right-arrow';
    rightArrow.innerHTML = '&gt;';
    viewport.appendChild(rightArrow);
    
    // Add click handlers
    leftArrow.addEventListener('click', () => {
        if (totalLLMs <= 3) return; // No need to scroll
        currentStartIndex = (currentStartIndex - 1 + totalLLMs) % totalLLMs;
        updateCarouselModels(llms);
    });
    
    rightArrow.addEventListener('click', () => {
        if (totalLLMs <= 3) return; // No need to scroll
        currentStartIndex = (currentStartIndex + 1) % totalLLMs;
        updateCarouselModels(llms);
    });
    
    // Add item indicators (dots)
    if (totalLLMs > 3) {
        const indicators = document.createElement('div');
        indicators.className = 'carousel-indicators';
        
        for (let i = 0; i < totalLLMs; i++) {
            const dot = document.createElement('div');
            dot.className = 'carousel-dot';
            dot.dataset.index = i;
            if (i === currentStartIndex) {
                dot.classList.add('active');
            }
            
            dot.addEventListener('click', () => {
                currentStartIndex = i;
                updateCarouselModels(llms);
                
                // Update active dot
                document.querySelectorAll('.carousel-dot').forEach(d => {
                    d.classList.remove('active');
                });
                dot.classList.add('active');
            });
            
            indicators.appendChild(dot);
        }
        
        viewport.appendChild(indicators);
    }
}

function createStandardModel(llm) {
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
    head.castShadow = true;
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
    body.castShadow = true;
    group.add(body);
    
    // Create limbs
    const limbsMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Arms
    const arms = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.2, 0.2),
        limbsMaterial
    );
    arms.position.y = 1.3;
    arms.castShadow = true;
    group.add(arms);
    
    // Legs
    const legs = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.15, 1),
        limbsMaterial
    );
    legs.position.y = 0.5;
    legs.castShadow = true;
    group.add(legs);
    
    return group;
}

function createFallbackModel(llm) {
    const group = new THREE.Group();
    
    const color = new THREE.Color(llm.color || 0x3cb371);
    
    // Simple cylinder body
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 1.7),
        new THREE.MeshStandardMaterial({ color })
    );
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);
    
    return group;
}

function animateCarousel() {
    if (!carouselScene || !carouselCamera || !carouselRenderer) return;
    
    carouselAnimationId = requestAnimationFrame(animateCarousel);
    
    // Rotate models gently
    carouselModels.forEach((model, i) => {
        if (model) {
            const time = Date.now() * 0.001;
            model.rotation.y = Math.sin(time * 0.5 + i) * 0.5;
        }
    });
    
    carouselRenderer.render(carouselScene, carouselCamera);
}

export function disposeCarouselView() {
    if (carouselAnimationId) {
        cancelAnimationFrame(carouselAnimationId);
    }
    
    if (carouselRenderer) {
        carouselRenderer.dispose();
    }
    
    carouselModels.forEach(model => {
        if (model && model.parent) {
            model.parent.remove(model);
        }
    });
    
    carouselModels = [];
}