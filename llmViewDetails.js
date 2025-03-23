// New file for detailed LLM view rendering
import * as THREE from 'three';
import { createCustomCharacter } from './characterGenerator.js';

let detailScene, detailCamera, detailRenderer;
let detailModel = null;
let detailAnimationId;

export function renderLLMDetailView(llm, viewport) {
    if (!viewport) return;
    
    // Cancel any existing animation
    if (detailAnimationId) {
        cancelAnimationFrame(detailAnimationId);
    }
    
    // Clear existing content
    viewport.innerHTML = '';
    
    // Set up THREE.js scene
    detailScene = new THREE.Scene();
    detailScene.background = new THREE.Color(0x111111);
    
    // Setup camera
    detailCamera = new THREE.PerspectiveCamera(
        45,
        viewport.clientWidth / viewport.clientHeight,
        0.1,
        1000
    );
    detailCamera.position.set(0, 1.5, 4);
    detailCamera.lookAt(0, 1, 0);
    
    // Setup renderer
    detailRenderer = new THREE.WebGLRenderer({ antialias: true });
    detailRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    detailRenderer.shadowMap.enabled = true;
    viewport.appendChild(detailRenderer.domElement);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    detailScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 5, 3);
    directionalLight.castShadow = true;
    detailScene.add(directionalLight);
    
    // Add floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.y = -1;
    detailScene.add(floor);
    
    // Display the LLM model
    if (llm.customCharacterCode) {
        // Create from custom character code
        try {
            detailModel = createCustomCharacter(THREE, llm.customCharacterCode);
        } catch (error) {
            console.error("Error creating custom character:", error);
            detailModel = createStandardDetailModel(llm);
        }
    } else {
        // Create standard model
        detailModel = createStandardDetailModel(llm);
    }
    
    detailScene.add(detailModel);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (detailCamera && detailRenderer && viewport) {
            detailCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            detailCamera.updateProjectionMatrix();
            detailRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    });
    
    // Start animation
    animateDetailModel();
}

function createStandardDetailModel(llm) {
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

function animateDetailModel() {
    if (!detailScene || !detailCamera || !detailRenderer) return;
    
    detailAnimationId = requestAnimationFrame(animateDetailModel);
    
    // Simple idle animation
    if (detailModel) {
        const time = Date.now() * 0.001;
        
        // Gentle bobbing motion
        detailModel.position.y = Math.sin(time) * 0.05;
        
        // Gentle rotation
        detailModel.rotation.y = Math.sin(time * 0.5) * 0.5;
    }
    
    detailRenderer.render(detailScene, detailCamera);
}

export function cleanupDetailView() {
    if (detailAnimationId) {
        cancelAnimationFrame(detailAnimationId);
    }
}