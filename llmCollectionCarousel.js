import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';

// State for carousel
let carouselLLMs = [];
let currentIndex = 0;
let llmModels = [];
let scene, camera, renderer, animationId;
let leftArrow, rightArrow;

export function setupLLMCarousel(viewportElement, llms) {
    console.log('Setting up LLM Carousel with element:', viewportElement);
    console.log('LLMs to display:', llms);
    
    // Store LLMs and reset index
    carouselLLMs = [...llms];
    currentIndex = 0;
    
    // Clear existing content and models
    viewportElement.innerHTML = '';
    llmModels = [];
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        console.log('Cancelled previous animation frame in carousel');
    }
    
    // Only proceed if we have LLMs to display
    if (carouselLLMs.length === 0) {
        displayEmptyState(viewportElement);
        console.log('No LLMs to display in carousel, showing empty state');
        return;
    }
    
    // Check if viewport is properly sized
    console.log('Viewport dimensions:', viewportElement.clientWidth, 'x', viewportElement.clientHeight);
    if (viewportElement.clientWidth === 0 || viewportElement.clientHeight === 0) {
        console.error('Viewport has zero dimensions. Check CSS and DOM structure.');
        // Force a minimum size to debug rendering issues
        viewportElement.style.minWidth = '400px';
        viewportElement.style.minHeight = '300px';
        console.log('Applied minimum dimensions to viewport for debugging');
    }
    
    // Initialize Three.js scene
    console.log('Initializing carousel Three.js scene');
    initCarouselScene(viewportElement);
    
    // Add navigation arrows
    addNavigationArrows(viewportElement);
    
    // Load initial models
    updateCarouselModels();
    
    // Start animation
    animateCarousel();
    console.log('Carousel animation started');
}

function initCarouselScene(viewportElement) {
    try {
        // Setup Three.js scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        console.log('Scene created with background color');
        
        // Setup camera
        camera = new THREE.PerspectiveCamera(
            45, 
            viewportElement.clientWidth / viewportElement.clientHeight, 
            0.1, 
            1000
        );
        camera.position.set(0, 2, 7);
        camera.lookAt(0, 1, 0);
        console.log('Camera set up at position:', camera.position);
        
        // Setup renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(viewportElement.clientWidth, viewportElement.clientHeight);
        renderer.shadowMap.enabled = true;
        viewportElement.appendChild(renderer.domElement);
        console.log('Renderer created and added to viewport', renderer.domElement);
        
        // Add debugging info to renderer
        renderer.domElement.style.border = '1px solid red';
        renderer.domElement.title = 'Carousel Renderer';
        console.log('Added debug border to renderer');
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 5, 3);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        console.log('Lights added to scene');
        
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
        scene.add(floor);
        console.log('Floor added to scene');
        
        // Add a helper axis for debugging
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);
        console.log('Added axes helper for debugging');
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (camera && renderer && viewportElement) {
                console.log('Handling resize event for carousel');
                camera.aspect = viewportElement.clientWidth / viewportElement.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(viewportElement.clientWidth, viewportElement.clientHeight);
            }
        });
        
        console.log('Carousel scene initialization complete');
    } catch (error) {
        console.error('Error initializing carousel scene:', error);
    }
}

function addNavigationArrows(viewportElement) {
    // Create left arrow
    leftArrow = document.createElement('button');
    leftArrow.className = 'carousel-arrow left-arrow';
    leftArrow.innerHTML = '&lt;';
    leftArrow.addEventListener('click', navigateLeft);
    viewportElement.appendChild(leftArrow);
    
    // Create right arrow
    rightArrow = document.createElement('button');
    rightArrow.className = 'carousel-arrow right-arrow';
    rightArrow.innerHTML = '&gt;';
    rightArrow.addEventListener('click', navigateRight);
    viewportElement.appendChild(rightArrow);
    
    // Update arrow visibility
    updateArrowVisibility();
}

function navigateLeft() {
    if (currentIndex > 0) {
        currentIndex--;
        updateCarouselModels();
        updateArrowVisibility();
    }
}

function navigateRight() {
    if (currentIndex < carouselLLMs.length - 1) {
        currentIndex++;
        updateCarouselModels();
        updateArrowVisibility();
    }
}

function updateArrowVisibility() {
    // Show/hide arrows based on position in carousel
    if (leftArrow && rightArrow) {
        leftArrow.style.opacity = currentIndex > 0 ? "1" : "0.3";
        rightArrow.style.opacity = currentIndex < carouselLLMs.length - 1 ? "1" : "0.3";
    }
}

function updateCarouselModels() {
    console.log('Updating carousel models. Current index:', currentIndex);
    
    // Remove existing models
    llmModels.forEach(model => {
        if (model && model.parent) {
            model.parent.remove(model);
            console.log('Removed existing model from scene');
        }
    });
    llmModels = [];
    
    // Determine which LLMs to display (current, previous, next)
    const displayIndices = [];
    displayIndices.push(currentIndex);
    
    if (currentIndex > 0) {
        displayIndices.unshift(currentIndex - 1);
    }
    
    if (currentIndex < carouselLLMs.length - 1) {
        displayIndices.push(currentIndex + 1);
    }
    
    console.log('Models to display at indices:', displayIndices);
    
    // Create and position models
    displayIndices.forEach((index, i) => {
        const llm = carouselLLMs[index];
        console.log('Creating model for LLM:', llm.name, 'at index', index);
        
        const position = calculatePosition(index - currentIndex);
        console.log('Calculated position:', position);
        
        try {
            const model = createLLMModel(llm);
            console.log('Model created for LLM:', llm.name);
            
            model.position.set(position.x, position.y, position.z);
            model.rotation.y = position.rotation;
            model.userData = { id: llm.id, index: index };
            
            // For debugging visibility issues
            // Add a sphere at the model position
            const debugSphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            debugSphere.position.set(0, 1, 0);
            model.add(debugSphere);
            console.log('Added debug sphere to model');
            
            scene.add(model);
            llmModels.push(model);
            console.log('Model added to scene at position:', model.position);
        } catch (error) {
            console.error('Error creating model for LLM:', llm.name, error);
        }
    });
    
    console.log('Carousel models updated, total models:', llmModels.length);
}

function calculatePosition(offset) {
    // Calculate position based on offset from center
    const x = offset * 3; // Horizontal spacing
    const z = Math.abs(offset) * 2; // Push off-center models back
    const y = 0;
    const rotation = -offset * 0.3; // Turn model slightly toward camera
    
    return { x, y, z, rotation };
}

function createLLMModel(llm) {
    if (llm.customCharacterCode) {
        // Create custom character from stored code
        try {
            return createCustomCharacter(THREE, llm.customCharacterCode);
        } catch (error) {
            console.error("Error creating custom character:", error);
            // Fall back to standard model
            return createStandardModel(llm);
        }
    } else {
        // Create standard model
        return createStandardModel(llm);
    }
}

function createStandardModel(llm) {
    // Create a robot model based on the stored properties
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
    
    // Create limbs
    const limbsMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Add arms and legs
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

function displayEmptyState(viewportElement) {
    // Display a message when no LLMs are available
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-carousel';
    emptyMessage.innerHTML = `
        <p>No LLMs have been created yet.</p>
        <p>Create your first LLM to see it here!</p>
    `;
    viewportElement.appendChild(emptyMessage);
}

function animateCarousel() {
    if (!scene || !camera || !renderer) {
        console.error('Cannot animate: scene, camera, or renderer is missing');
        return;
    }
    
    animationId = requestAnimationFrame(animateCarousel);
    
    try {
        // Animate models
        llmModels.forEach((model, index) => {
            if (!model) return;
            
            const time = Date.now() * 0.001;
            const offset = index * 0.5;
            
            // Simple hover effect
            const originY = calculatePosition(model.userData.index - currentIndex).y;
            model.position.y = originY + Math.sin(time + offset) * 0.1;
            
            // Subtle rotation
            const baseRotation = calculatePosition(model.userData.index - currentIndex).rotation;
            model.rotation.y = baseRotation + Math.sin(time * 0.5 + offset) * 0.1;
        });
        
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Error in carousel animation:', error);
        cancelAnimationFrame(animationId);
    }
}

export function cleanupCarousel() {
    console.log('Cleaning up carousel');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        console.log('Cancelled animation frame');
    }
    
    // Clean up all models
    if (scene) {
        llmModels.forEach(model => {
            if (model && model.parent) {
                model.parent.remove(model);
            }
        });
        console.log('Removed all models from scene');
    }
    
    llmModels = [];
    scene = null;
    camera = null;
    renderer = null;
    console.log('Reset all carousel variables');
}