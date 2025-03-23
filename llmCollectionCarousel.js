import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';

// State for carousel
let carouselLLMs = [];
let currentIndex = 0;
let llmModels = [];
let scene, camera, renderer, animationId;
let leftArrow, rightArrow;

export function setupLLMCarousel(viewportElement, llms) {
    // Store LLMs and reset index
    carouselLLMs = [...llms];
    currentIndex = 0;
    
    // Clear existing content and models
    viewportElement.innerHTML = '';
    llmModels = [];
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Only proceed if we have LLMs to display
    if (carouselLLMs.length === 0) {
        displayEmptyState(viewportElement);
        return;
    }
    
    // Force viewport to be visible and have proper dimensions first
    viewportElement.style.width = '100%';
    viewportElement.style.height = '100%';
    viewportElement.style.minWidth = '400px';
    viewportElement.style.minHeight = '300px';
    viewportElement.style.display = 'block';
    
    // Delay initialization to allow dimensions to be applied
    setTimeout(() => {
        // Initialize Three.js scene
        initCarouselScene(viewportElement);
        
        // Add navigation arrows
        addNavigationArrows(viewportElement);
        
        // Load initial models
        updateCarouselModels();
        
        // Start animation
        animateCarousel();
    }, 50);
}

function initCarouselScene(viewportElement) {
    try {
        // Setup Three.js scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        
        // Setup camera
        camera = new THREE.PerspectiveCamera(
            45, 
            viewportElement.clientWidth / viewportElement.clientHeight, 
            0.1, 
            1000
        );
        camera.position.set(0, 2, 7);
        camera.lookAt(0, 1, 0);
        
        // Setup renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(viewportElement.clientWidth, viewportElement.clientHeight);
        renderer.shadowMap.enabled = true;
        viewportElement.appendChild(renderer.domElement);
        
        // Explicitly set renderer size based on parent
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 5, 3);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
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
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (camera && renderer && viewportElement) {
                camera.aspect = viewportElement.clientWidth / viewportElement.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(viewportElement.clientWidth, viewportElement.clientHeight);
            }
        });
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
    // Remove existing models
    llmModels.forEach(model => {
        if (model && model.parent) {
            model.parent.remove(model);
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
    
    // Create and position models
    displayIndices.forEach((index, i) => {
        const llm = carouselLLMs[index];
        
        const position = calculatePosition(index - currentIndex);
        
        try {
            const model = createLLMModel(llm);
            
            model.position.set(position.x, position.y, position.z);
            model.rotation.y = position.rotation;
            model.userData = { id: llm.id, index: index };
            
            scene.add(model);
            llmModels.push(model);
        } catch (error) {
            console.error('Error creating model for LLM:', llm.name, error);
        }
    });
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
    
    // Upper arms
    const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    const lowerArmGeometry = new THREE.CylinderGeometry(0.07, 0.06, 0.4);
    
    // Left arm
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, limbsMaterial);
    leftUpperArm.position.set(-0.4, 1.3, 0);
    leftUpperArm.rotation.z = Math.PI / 6;
    leftUpperArm.castShadow = true;
    group.add(leftUpperArm);
    
    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, limbsMaterial);
    leftLowerArm.position.set(-0.55, 1.0, 0);
    leftLowerArm.rotation.z = Math.PI / 4;
    leftLowerArm.castShadow = true;
    group.add(leftLowerArm);
    
    // Right arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, limbsMaterial);
    rightUpperArm.position.set(0.4, 1.3, 0);
    rightUpperArm.rotation.z = -Math.PI / 6;
    rightUpperArm.castShadow = true;
    group.add(rightUpperArm);
    
    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, limbsMaterial);
    rightLowerArm.position.set(0.55, 1.0, 0);
    rightLowerArm.rotation.z = -Math.PI / 4;
    rightLowerArm.castShadow = true;
    group.add(rightLowerArm);
    
    // Legs
    const upperLegGeometry = new THREE.CylinderGeometry(0.09, 0.08, 0.4);
    const lowerLegGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    
    // Left leg
    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, limbsMaterial);
    leftUpperLeg.position.set(-0.15, 0.5, 0);
    leftUpperLeg.castShadow = true;
    group.add(leftUpperLeg);
    
    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, limbsMaterial);
    leftLowerLeg.position.set(-0.15, 0.1, 0);
    leftLowerLeg.castShadow = true;
    group.add(leftLowerLeg);
    
    const leftFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.25),
        limbsMaterial
    );
    leftFoot.position.set(-0.15, -0.1, 0.05);
    leftFoot.castShadow = true;
    group.add(leftFoot);
    
    // Right leg
    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, limbsMaterial);
    rightUpperLeg.position.set(0.15, 0.5, 0);
    rightUpperLeg.castShadow = true;
    group.add(rightUpperLeg);
    
    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, limbsMaterial);
    rightLowerLeg.position.set(0.15, 0.1, 0);
    rightLowerLeg.castShadow = true;
    group.add(rightLowerLeg);
    
    const rightFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.25),
        limbsMaterial
    );
    rightFoot.position.set(0.15, -0.1, 0.05);
    rightFoot.castShadow = true;
    group.add(rightFoot);
    
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
}

export function cleanupCarousel() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Clean up all models
    if (scene) {
        llmModels.forEach(model => {
            if (model && model.parent) {
                model.parent.remove(model);
            }
        });
    }
    
    llmModels = [];
    scene = null;
    camera = null;
    renderer = null;
}