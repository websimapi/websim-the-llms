import * as THREE from 'three';
import { config } from './config.js';

// Store global variables for the humanoid preview
let humanoidScene, humanoidCamera, humanoidRenderer, humanoidMixer, humanoidClock;
let robotModel, headMaterial, bodyMaterial, limbsMaterial;
let currentCustomPrompt = '';

// Make functions accessible globally
window.setupLLMCreationInterface = setupLLMCreationInterface;
window.updateHumanoidPreview = updateHumanoidPreview;
window.generateCustomAppearance = generateCustomAppearance;

function setupLLMCreationInterface() {
    // Setup default values for the form
    document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;
    
    // Add event listeners for form elements that should update the humanoid preview
    document.getElementById('llm-color').addEventListener('input', updateHumanoidPreview);
    document.getElementById('llm-style').addEventListener('change', updateHumanoidPreview);
    
    // Add event listeners for custom appearance generation
    document.getElementById('generate-appearance-btn').addEventListener('click', () => {
        const customPrompt = document.getElementById('custom-appearance-prompt').value.trim();
        if (customPrompt) {
            currentCustomPrompt = customPrompt;
            generateCustomAppearance(customPrompt);
        }
    });
    
    // Initialize the humanoid preview
    initHumanoidPreview();
}

function initHumanoidPreview() {
    const viewport = document.querySelector('.humanoid-viewport');
    
    // Clear existing content
    viewport.innerHTML = '';
    
    // Setup Three.js scene
    humanoidScene = new THREE.Scene();
    humanoidScene.background = new THREE.Color(0x111111);
    
    // Setup camera
    humanoidCamera = new THREE.PerspectiveCamera(
        45, 
        viewport.clientWidth / viewport.clientHeight, 
        0.1, 
        1000
    );
    humanoidCamera.position.set(0, 1.5, 4);
    humanoidCamera.lookAt(0, 1, 0);
    
    // Setup renderer
    humanoidRenderer = new THREE.WebGLRenderer({ antialias: true });
    humanoidRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
    humanoidRenderer.shadowMap.enabled = true;
    viewport.appendChild(humanoidRenderer.domElement);
    
    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    humanoidScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 5, 3);
    directionalLight.castShadow = true;
    humanoidScene.add(directionalLight);
    
    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -1;
    humanoidScene.add(ground);
    
    // Create robot humanoid model
    createRobotModel();
    
    // Setup animation clock
    humanoidClock = new THREE.Clock();
    
    // Start animation loop
    animateHumanoid();
    
    // Handle resize
    window.addEventListener('resize', () => {
        if (humanoidCamera && humanoidRenderer && viewport) {
            humanoidCamera.aspect = viewport.clientWidth / viewport.clientHeight;
            humanoidCamera.updateProjectionMatrix();
            humanoidRenderer.setSize(viewport.clientWidth, viewport.clientHeight);
        }
    });
}

function createRobotModel() {
    // Get current selected color
    const color = document.getElementById('llm-color').value;
    const style = document.getElementById('llm-style').value;
    
    // Create materials based on selected style
    let emissiveIntensity = 0;
    let metalness = 0.2;
    let roughness = 0.7;
    
    switch(style) {
        case 'modern':
            metalness = 0.6;
            roughness = 0.2;
            break;
        case 'classic':
            metalness = 0.1;
            roughness = 0.9;
            break;
        case 'retro':
            metalness = 0.3;
            roughness = 0.8;
            break;
        case 'futuristic':
            metalness = 0.8;
            roughness = 0.1;
            emissiveIntensity = 0.5;
            break;
    }
    
    // Create materials
    headMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color).multiplyScalar(0.3),
        emissiveIntensity: emissiveIntensity,
        metalness: metalness + 0.2,
        roughness: roughness - 0.1
    });
    
    bodyMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).multiplyScalar(0.8),
        emissive: new THREE.Color(color).multiplyScalar(0.2),
        emissiveIntensity: emissiveIntensity,
        metalness: metalness,
        roughness: roughness
    });
    
    limbsMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x444444),
        emissive: new THREE.Color(color).multiplyScalar(0.1),
        emissiveIntensity: emissiveIntensity,
        metalness: metalness + 0.3,
        roughness: roughness + 0.1
    });
    
    // Create robot parts
    const robotGroup = new THREE.Group();
    
    // Head
    const head = new THREE.Group();
    const headMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        headMaterial
    );
    head.add(headMain);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.05, 0.2);
    head.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.05, 0.2);
    head.add(rightEye);
    
    // Antenna
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.2),
        limbsMaterial
    );
    antenna.position.set(0, 0.3, 0);
    head.add(antenna);
    
    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    antennaTip.position.set(0, 0.4, 0);
    head.add(antennaTip);
    
    head.position.set(0, 1.8, 0);
    head.castShadow = true;
    robotGroup.add(head);
    
    // Neck
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1),
        limbsMaterial
    );
    neck.position.set(0, 1.6, 0);
    neck.castShadow = true;
    robotGroup.add(neck);
    
    // Torso
    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.3),
        bodyMaterial
    );
    torso.position.set(0, 1.2, 0);
    torso.castShadow = true;
    robotGroup.add(torso);
    
    // Chest light
    const chestLight = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 32),
        new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(color).multiplyScalar(1.5) 
        })
    );
    chestLight.position.set(0, 1.3, 0.16);
    chestLight.rotation.x = Math.PI / 2;
    robotGroup.add(chestLight);
    
    // Arms
    const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    const lowerArmGeometry = new THREE.CylinderGeometry(0.07, 0.06, 0.4);
    
    // Left arm
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, limbsMaterial);
    leftUpperArm.position.set(-0.4, 1.3, 0);
    leftUpperArm.rotation.z = Math.PI / 6;
    leftUpperArm.castShadow = true;
    robotGroup.add(leftUpperArm);
    
    const leftLowerArm = new THREE.Mesh(lowerArmGeometry, limbsMaterial);
    leftLowerArm.position.set(-0.55, 1.0, 0);
    leftLowerArm.rotation.z = Math.PI / 4;
    leftLowerArm.castShadow = true;
    robotGroup.add(leftLowerArm);
    
    const leftHand = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        headMaterial
    );
    leftHand.position.set(-0.75, 0.8, 0);
    leftHand.castShadow = true;
    robotGroup.add(leftHand);
    
    // Right arm
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, limbsMaterial);
    rightUpperArm.position.set(0.4, 1.3, 0);
    rightUpperArm.rotation.z = -Math.PI / 6;
    rightUpperArm.castShadow = true;
    robotGroup.add(rightUpperArm);
    
    const rightLowerArm = new THREE.Mesh(lowerArmGeometry, limbsMaterial);
    rightLowerArm.position.set(0.55, 1.0, 0);
    rightLowerArm.rotation.z = -Math.PI / 4;
    rightLowerArm.castShadow = true;
    robotGroup.add(rightLowerArm);
    
    const rightHand = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        headMaterial
    );
    rightHand.position.set(0.75, 0.8, 0);
    rightHand.castShadow = true;
    robotGroup.add(rightHand);
    
    // Hip
    const hip = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.2, 0.3),
        bodyMaterial
    );
    hip.position.set(0, 0.8, 0);
    hip.castShadow = true;
    robotGroup.add(hip);
    
    // Legs
    const upperLegGeometry = new THREE.CylinderGeometry(0.09, 0.08, 0.4);
    const lowerLegGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    
    // Left leg
    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, limbsMaterial);
    leftUpperLeg.position.set(-0.15, 0.5, 0);
    leftUpperLeg.castShadow = true;
    robotGroup.add(leftUpperLeg);
    
    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, limbsMaterial);
    leftLowerLeg.position.set(-0.15, 0.1, 0);
    leftLowerLeg.castShadow = true;
    robotGroup.add(leftLowerLeg);
    
    const leftFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.25),
        limbsMaterial
    );
    leftFoot.position.set(-0.15, -0.1, 0.05);
    leftFoot.castShadow = true;
    robotGroup.add(leftFoot);
    
    // Right leg
    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, limbsMaterial);
    rightUpperLeg.position.set(0.15, 0.5, 0);
    rightUpperLeg.castShadow = true;
    robotGroup.add(rightUpperLeg);
    
    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, limbsMaterial);
    rightLowerLeg.position.set(0.15, 0.1, 0);
    rightLowerLeg.castShadow = true;
    robotGroup.add(rightLowerLeg);
    
    const rightFoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.25),
        limbsMaterial
    );
    rightFoot.position.set(0.15, -0.1, 0.05);
    rightFoot.castShadow = true;
    robotGroup.add(rightFoot);
    
    // Add robot to scene
    robotModel = robotGroup;
    humanoidScene.add(robotModel);
}

function updateHumanoidPreview() {
    if (!robotModel) return;
    
    // Get new color and style
    const color = document.getElementById('llm-color').value;
    const style = document.getElementById('llm-style').value;
    
    // Update materials based on style
    let emissiveIntensity = 0;
    let metalness = 0.2;
    let roughness = 0.7;
    
    switch(style) {
        case 'modern':
            metalness = 0.6;
            roughness = 0.2;
            break;
        case 'classic':
            metalness = 0.1;
            roughness = 0.9;
            break;
        case 'retro':
            metalness = 0.3;
            roughness = 0.8;
            break;
        case 'futuristic':
            metalness = 0.8;
            roughness = 0.1;
            emissiveIntensity = 0.5;
            break;
    }
    
    // Update materials
    if (headMaterial) {
        headMaterial.color.set(color);
        headMaterial.emissive.set(color).multiplyScalar(0.3);
        headMaterial.emissiveIntensity = emissiveIntensity;
        headMaterial.metalness = metalness + 0.2;
        headMaterial.roughness = roughness - 0.1;
    }
    
    if (bodyMaterial) {
        bodyMaterial.color.set(new THREE.Color(color).multiplyScalar(0.8));
        bodyMaterial.emissive.set(color).multiplyScalar(0.2);
        bodyMaterial.emissiveIntensity = emissiveIntensity;
        bodyMaterial.metalness = metalness;
        bodyMaterial.roughness = roughness;
    }
    
    if (limbsMaterial) {
        limbsMaterial.emissive.set(color).multiplyScalar(0.1);
        limbsMaterial.emissiveIntensity = emissiveIntensity;
        limbsMaterial.metalness = metalness + 0.3;
        limbsMaterial.roughness = roughness + 0.1;
    }
    
    // Update chest light color
    if (robotModel) {
        const chestLight = robotModel.children.find(c => c.geometry && c.geometry.type === 'CircleGeometry');
        if (chestLight && chestLight.material) {
            chestLight.material.color.set(new THREE.Color(color).multiplyScalar(1.5));
        }
    }
}

async function generateCustomAppearance(prompt) {
    try {
        // Show loading state
        const generateBtn = document.getElementById('generate-appearance-btn');
        const originalBtnText = generateBtn.textContent;
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;
        
        // Get the current model type to include in the prompt
        const modelType = document.getElementById('llm-model').value;
        
        // Make the LLM call to get design suggestions
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a character designer for a game about AI models called "The LLMs". 
                    Based on the user's description, generate a JSON object with design parameters for a ${modelType} type AI character.
                    Include only the JSON in your response with these properties:
                    - baseColor: a hex color code that fits the description
                    - style: one of "modern", "classic", "retro", or "futuristic"
                    - intelligence: a number between 1-10
                    - creativity: a number between 1-10
                    - reliability: a number between 1-10
                    - description: a short (30 words max) visual description of the character
                    - specialFeature: one special visual feature to add to the model (like a unique head shape, extra antenna, etc.)`
                },
                {
                    role: "user",
                    content: `Design an AI character that looks like: ${prompt}`
                }
            ],
            json: true
        });
        
        // Parse the response
        const design = JSON.parse(completion.content);
        
        // Update the form with the generated values
        document.getElementById('llm-color').value = design.baseColor;
        document.getElementById('llm-style').value = design.style;
        document.getElementById('llm-intelligence').value = design.intelligence;
        document.getElementById('intelligence-value').textContent = design.intelligence;
        document.getElementById('llm-creativity').value = design.creativity;
        document.getElementById('creativity-value').textContent = design.creativity;
        document.getElementById('llm-reliability').value = design.reliability;
        document.getElementById('reliability-value').textContent = design.reliability;
        
        // Display the description
        document.getElementById('ai-description').textContent = design.description;
        document.getElementById('ai-special-feature').textContent = design.specialFeature;
        document.getElementById('ai-generated-details').style.display = 'block';
        
        // Update the preview
        updateHumanoidPreview();
        
        // Reset button
        generateBtn.textContent = originalBtnText;
        generateBtn.disabled = false;
        
    } catch (error) {
        console.error("Error generating custom appearance:", error);
        const generateBtn = document.getElementById('generate-appearance-btn');
        generateBtn.textContent = 'Try Again';
        generateBtn.disabled = false;
        document.getElementById('ai-description').textContent = 'Error generating design. Please try again.';
        document.getElementById('ai-generated-details').style.display = 'block';
    }
}

function animateHumanoid() {
    if (!humanoidScene || !humanoidCamera || !humanoidRenderer) return;
    
    requestAnimationFrame(animateHumanoid);
    
    // Simple idle animation
    if (robotModel) {
        const time = Date.now() * 0.001;
        
        // Gentle bobbing motion
        robotModel.position.y = Math.sin(time) * 0.05;
        
        // Gentle rotation
        robotModel.rotation.y = Math.sin(time * 0.5) * 0.5;
    }
    
    // Update animation mixer if exists
    if (humanoidMixer) {
        humanoidMixer.update(humanoidClock.getDelta());
    }
    
    humanoidRenderer.render(humanoidScene, humanoidCamera);
}