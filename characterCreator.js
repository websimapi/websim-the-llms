import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let characterScene, characterCamera, characterRenderer, characterControls;
let characterMesh, headMesh, bodyMesh, leftArmMesh, rightArmMesh, leftLegMesh, rightLegMesh;
let currentColors = {
    head: 0xf5d0c5,  // Default skin tone
    body: 0x3498db,  // Default blue body
    leftArm: 0x3498db,
    rightArm: 0x3498db,
    leftLeg: 0x2c3e50,  // Default dark pants
    rightLeg: 0x2c3e50
};

const availableVoices = [
    { id: 'voice1', name: 'Standard Voice', sample: 'Hello, I am your LLM assistant' },
    { id: 'voice2', name: 'Friendly Voice', sample: 'Hi there! I\'m here to help you!' },
    { id: 'voice3', name: 'Professional Voice', sample: 'Greetings. I am prepared to assist with your queries.' },
    { id: 'voice4', name: 'Cheerful Voice', sample: 'Hey! So excited to work with you today!' }
];

let selectedVoice = availableVoices[0];

export function initCharacterCreator() {
    const characterCreator = document.getElementById('character-creator');
    if (characterCreator.classList.contains('hidden')) {
        characterCreator.classList.remove('hidden');
        setupCharacterScene();
        setupColorPickers();
        setupVoiceSelection();
    }
}

function setupCharacterScene() {
    const characterPreview = document.getElementById('character-preview');
    
    // Clear previous scene if it exists
    while(characterPreview.firstChild) {
        characterPreview.removeChild(characterPreview.firstChild);
    }
    
    // Setup scene
    characterScene = new THREE.Scene();
    characterScene.background = new THREE.Color(0xe0f5e0);
    
    // Setup camera
    characterCamera = new THREE.PerspectiveCamera(
        45, 
        characterPreview.clientWidth / characterPreview.clientHeight, 
        0.1, 
        1000
    );
    characterCamera.position.set(0, 1.5, 4);
    
    // Setup renderer
    characterRenderer = new THREE.WebGLRenderer({ antialias: true });
    characterRenderer.setSize(characterPreview.clientWidth, characterPreview.clientHeight);
    characterPreview.appendChild(characterRenderer.domElement);
    
    // Setup lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    characterScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 4, 2);
    characterScene.add(directionalLight);
    
    // Setup controls
    characterControls = new OrbitControls(characterCamera, characterRenderer.domElement);
    characterControls.enableDamping = true;
    characterControls.dampingFactor = 0.05;
    characterControls.minDistance = 2;
    characterControls.maxDistance = 7;
    
    // Create character
    createCharacterMesh();
    
    // Handle window resize
    window.addEventListener('resize', onCharacterWindowResize);
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        characterControls.update();
        characterRenderer.render(characterScene, characterCamera);
    }
    
    animate();
}

function onCharacterWindowResize() {
    const characterPreview = document.getElementById('character-preview');
    characterCamera.aspect = characterPreview.clientWidth / characterPreview.clientHeight;
    characterCamera.updateProjectionMatrix();
    characterRenderer.setSize(characterPreview.clientWidth, characterPreview.clientHeight);
}

function createCharacterMesh() {
    // Create group for entire character
    characterMesh = new THREE.Group();
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({ color: currentColors.head });
    headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.y = 1.75;
    characterMesh.add(headMesh);
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: currentColors.body });
    bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 1.25;
    characterMesh.add(bodyMesh);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    
    // Left arm
    const leftArmMaterial = new THREE.MeshStandardMaterial({ color: currentColors.leftArm });
    leftArmMesh = new THREE.Mesh(armGeometry, leftArmMaterial);
    leftArmMesh.position.set(-0.325, 1.25, 0);
    characterMesh.add(leftArmMesh);
    
    // Right arm
    const rightArmMaterial = new THREE.MeshStandardMaterial({ color: currentColors.rightArm });
    rightArmMesh = new THREE.Mesh(armGeometry, rightArmMaterial);
    rightArmMesh.position.set(0.325, 1.25, 0);
    characterMesh.add(rightArmMesh);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    
    // Left leg
    const leftLegMaterial = new THREE.MeshStandardMaterial({ color: currentColors.leftLeg });
    leftLegMesh = new THREE.Mesh(legGeometry, leftLegMaterial);
    leftLegMesh.position.set(-0.15, 0.75, 0);
    characterMesh.add(leftLegMesh);
    
    // Right leg
    const rightLegMaterial = new THREE.MeshStandardMaterial({ color: currentColors.rightLeg });
    rightLegMesh = new THREE.Mesh(legGeometry, rightLegMaterial);
    rightLegMesh.position.set(0.15, 0.75, 0);
    characterMesh.add(rightLegMesh);
    
    // Add character to scene
    characterScene.add(characterMesh);
    
    // Add a simple platform
    const platformGeometry = new THREE.CylinderGeometry(1, 1, 0.1, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x95a5a6 });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 0.45;
    characterScene.add(platform);
    
    // Add a simple grid floor
    const gridHelper = new THREE.GridHelper(10, 10, 0x000000, 0x555555);
    gridHelper.position.y = 0.5;
    characterScene.add(gridHelper);
}

function setupColorPickers() {
    const bodyParts = ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    
    bodyParts.forEach(part => {
        const colorPicker = document.getElementById(`${part}-color`);
        if (colorPicker) {
            // Convert hex color to RGB hex string for input
            const hexColor = '#' + currentColors[part].toString(16).padStart(6, '0');
            colorPicker.value = hexColor;
            
            colorPicker.addEventListener('input', (e) => {
                // Convert RGB hex string to hex value
                const hexString = e.target.value.replace('#', '');
                const hexValue = parseInt(hexString, 16);
                currentColors[part] = hexValue;
                
                // Update the corresponding mesh
                switch(part) {
                    case 'head':
                        headMesh.material.color.set(hexValue);
                        break;
                    case 'body':
                        bodyMesh.material.color.set(hexValue);
                        break;
                    case 'leftArm':
                        leftArmMesh.material.color.set(hexValue);
                        break;
                    case 'rightArm':
                        rightArmMesh.material.color.set(hexValue);
                        break;
                    case 'leftLeg':
                        leftLegMesh.material.color.set(hexValue);
                        break;
                    case 'rightLeg':
                        rightLegMesh.material.color.set(hexValue);
                        break;
                }
            });
        }
    });
}

function setupVoiceSelection() {
    const voiceSelector = document.getElementById('voice-selector');
    if (voiceSelector) {
        // Clear existing options
        voiceSelector.innerHTML = '';
        
        // Add voice options
        availableVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = voice.name;
            voiceSelector.appendChild(option);
        });
        
        // Set default selection
        voiceSelector.value = selectedVoice.id;
        
        // Add change event listener
        voiceSelector.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            selectedVoice = availableVoices.find(voice => voice.id === selectedId);
            
            // Update the voice sample
            const voiceSample = document.getElementById('voice-sample');
            if (voiceSample) {
                voiceSample.textContent = selectedVoice.sample;
            }
        });
        
        // Add play sample button event
        const playSampleBtn = document.getElementById('play-sample');
        if (playSampleBtn) {
            playSampleBtn.addEventListener('click', () => {
                // Normally, we would play the TTS audio here
                // For now, we'll just simulate with speech synthesis if available
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(selectedVoice.sample);
                    window.speechSynthesis.speak(utterance);
                } else {
                    alert(selectedVoice.sample);
                }
            });
        }
    }
}

export function saveCharacter() {
    // Get character name
    const nameInput = document.getElementById('character-name');
    const name = nameInput ? nameInput.value : 'New LLM';
    
    // Save character data
    const characterData = {
        name: name,
        colors: { ...currentColors },
        voice: selectedVoice.id
    };
    
    console.log('Character saved:', characterData);
    
    // Close the character creator
    closeCharacterCreator();
    
    return characterData;
}

export function closeCharacterCreator() {
    const characterCreator = document.getElementById('character-creator');
    characterCreator.classList.add('hidden');
    
    // Clean up
    window.removeEventListener('resize', onCharacterWindowResize);
}