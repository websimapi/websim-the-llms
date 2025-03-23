import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';

// State for carousel functionality
let carouselModels = [];
let currentModelIndex = 0;
const visibleModels = 3;
let carouselGroup;

export function initLLMCarousel(llms, scene) {
    // Clear any existing models
    if (carouselGroup && carouselGroup.parent) {
        carouselGroup.parent.remove(carouselGroup);
    }
    
    // Create a group to hold all carousel models
    carouselGroup = new THREE.Group();
    scene.add(carouselGroup);
    
    // Save reference to all models
    carouselModels = [];
    
    // Create models for each LLM
    llms.forEach(llm => {
        let model;
        
        if (llm.customCharacterCode) {
            try {
                model = createCustomCharacter(THREE, llm.customCharacterCode);
            } catch (error) {
                console.error("Error creating custom character:", error);
                model = createStandardModel(llm);
            }
        } else {
            model = createStandardModel(llm);
        }
        
        // Store the model's ID for reference
        model.userData = { id: llm.id };
        
        // Hide all models initially
        model.visible = false;
        
        // Add to group
        carouselGroup.add(model);
        carouselModels.push(model);
    });
    
    // Position visible models
    updateCarouselView();
    
    return carouselGroup;
}

export function nextCarouselModel() {
    if (carouselModels.length <= visibleModels) return;
    
    currentModelIndex = (currentModelIndex + 1) % carouselModels.length;
    updateCarouselView();
}

export function prevCarouselModel() {
    if (carouselModels.length <= visibleModels) return;
    
    currentModelIndex = (currentModelIndex - 1 + carouselModels.length) % carouselModels.length;
    updateCarouselView();
}

function updateCarouselView() {
    // Hide all models first
    carouselModels.forEach(model => {
        model.visible = false;
    });
    
    // Show only visible models
    const numModels = carouselModels.length;
    const positions = [-4, 0, 4]; // Left, center, right positions
    
    for (let i = 0; i < Math.min(visibleModels, numModels); i++) {
        const modelIndex = (currentModelIndex + i) % numModels;
        const model = carouselModels[modelIndex];
        
        // Show model
        model.visible = true;
        
        // Position model - center is the focus
        model.position.set(positions[i], 0, 0);
        
        // Scale models - center is largest
        const scale = i === 1 ? 1 : 0.8;
        model.scale.set(scale, scale, scale);
        
        // Rotate models to face camera
        model.rotation.y = positions[i] > 0 ? -Math.PI/6 : (positions[i] < 0 ? Math.PI/6 : 0);
    }
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
    nameplate.position.set(0, 2.5, 0);
    nameplate.rotation.y = Math.PI;
    group.add(nameplate);
    
    return group;
}