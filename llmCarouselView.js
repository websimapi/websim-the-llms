import * as THREE from 'three';
import { createCollectionModels } from './llmCollectionViewUtils.js';
import { createCustomCharacter } from './characterGenerator.js';
import { llmDataManager } from './llmDataManager.js';

let carouselScene, carouselCamera, carouselRenderer;
let carouselModels = [];
let currentIndex = 0;
let animationId;
let totalLLMs = 0;

export function setupLLMCarousel(viewport, llms) {
    // Cancel any existing animation
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    totalLLMs = llms.length;
    
    // Clear existing content
    viewport.innerHTML = '';
    
    if (llms.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-carousel';
        emptyMessage.textContent = 'No LLMs to display';
        viewport.appendChild(emptyMessage);
        return;
    }
    
    // Setup Three.js scene
    carouselScene = new THREE.Scene();
    carouselScene.background = new THREE.Color(0x111111);
    
    // Setup camera
    carouselCamera = new THREE.PerspectiveCamera(
        45, 
        viewport.clientWidth / viewport.clientHeight, 
        0.1, 
        1000
    );
    carouselCamera.position.set(0, 3, 8);
    carouselCamera.lookAt(0, 1, 0);
    
    // Setup renderer
    carouselRenderer = new THREE.WebGLRenderer({ antialias: true });
    carouselRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    carouselRenderer.shadowMap.enabled = true;
    viewport.appendChild(carouselRenderer.domElement);
    
    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    carouselScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    carouselScene.add(directionalLight);
    
    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -1;
    carouselScene.add(ground);
    
    // Load all models but only display 3 at a time
    loadCarouselModels(llms);
    updateVisibleModels();
    
    // Create navigation arrows
    createNavigationArrows(viewport);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (carouselCamera && carouselRenderer && viewport) {
            carouselCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            carouselCamera.updateProjectionMatrix();
            carouselRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    });
    
    // Start animation loop
    animateCarousel();
}

function loadCarouselModels(llms) {
    carouselModels = [];
    
    llms.forEach((llm) => {
        let model;
        
        if (llm.customCharacterCode) {
            // Create custom character from stored code
            try {
                model = createCustomCharacter(THREE, llm.customCharacterCode);
            } catch (error) {
                console.error("Error creating custom character:", error);
                model = createStandardModel(llm);
            }
        } else {
            // Create standard model based on stored properties
            model = createStandardModel(llm);
        }
        
        model.visible = false;
        model.userData = { id: llm.id };
        model.scale.set(0.8, 0.8, 0.8);
        
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

function updateVisibleModels() {
    // Hide all models first
    carouselModels.forEach(model => {
        model.visible = false;
    });
    
    // Show only 3 models starting from currentIndex
    for (let i = 0; i < 3; i++) {
        const index = (currentIndex + i) % totalLLMs;
        if (carouselModels[index]) {
            carouselModels[index].visible = true;
            
            // Position the models in a row
            const xPos = (i - 1) * 3; // -3, 0, 3
            carouselModels[index].position.set(xPos, 0, 0);
            
            // Add nameplate to each model
            updateNameplate(carouselModels[index], index);
        }
    }
}

function updateNameplate(model, index) {
    // Remove existing nameplate if any
    model.children.forEach(child => {
        if (child.userData && child.userData.isNameplate) {
            model.remove(child);
        }
    });
    
    // Get LLM data
    const llmId = model.userData.id;
    const llm = llmDataManager.getLLMById(llmId);
    if (!llm) return;
    
    // Create a nameplate
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#3cb371';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(llm.name, canvas.width / 2, canvas.height / 2 + 8);
    
    const texture = new THREE.CanvasTexture(canvas);
    const nameplateMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true
    });
    
    const nameplate = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 0.5),
        nameplateMaterial
    );
    nameplate.position.set(0, 2.5, 0);
    nameplate.userData = { isNameplate: true };
    model.add(nameplate);
}

function createNavigationArrows(viewport) {
    // Create left arrow
    const leftArrow = document.createElement('div');
    leftArrow.className = 'carousel-arrow left-arrow';
    leftArrow.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
    `;
    viewport.appendChild(leftArrow);
    
    // Create right arrow
    const rightArrow = document.createElement('div');
    rightArrow.className = 'carousel-arrow right-arrow';
    rightArrow.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
    `;
    viewport.appendChild(rightArrow);
    
    // Create indicator dots
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel-dots';
    
    for (let i = 0; i < Math.ceil(totalLLMs / 3); i++) {
        const dot = document.createElement('div');
        dot.className = 'carousel-dot';
        if (i === 0) dot.classList.add('active');
        dotsContainer.appendChild(dot);
    }
    
    viewport.appendChild(dotsContainer);
    
    // Add event listeners
    leftArrow.addEventListener('click', () => {
        navigateCarousel(-1);
    });
    
    rightArrow.addEventListener('click', () => {
        navigateCarousel(1);
    });
}

function navigateCarousel(direction) {
    currentIndex = (currentIndex + direction + totalLLMs) % totalLLMs;
    updateVisibleModels();
    updateDotIndicators();
}

function updateDotIndicators() {
    const dots = document.querySelectorAll('.carousel-dot');
    const currentPage = Math.floor(currentIndex / 3);
    
    dots.forEach((dot, index) => {
        if (index === currentPage) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function animateCarousel() {
    if (!carouselScene || !carouselCamera || !carouselRenderer) return;
    
    animationId = requestAnimationFrame(animateCarousel);
    
    // Simple idle animation for models
    carouselModels.forEach((model, index) => {
        if (model.visible) {
            const time = Date.now() * 0.001;
            const offset = index * 0.5;
            
            // Simple hovering and rotation
            model.position.y = Math.sin(time + offset) * 0.1;
            model.rotation.y = Math.sin(time * 0.5 + offset) * 0.3;
        }
    });
    
    carouselRenderer.render(carouselScene, carouselCamera);
}

export function cleanupCarousel() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}