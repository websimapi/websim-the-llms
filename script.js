import { config } from './config.js';
import { cityData } from './cityData.js';
import * as THREE from 'three';

let bgAudio;
let useLLMTips = localStorage.getItem('useLLMTips') !== null ? 
    localStorage.getItem('useLLMTips') === 'true' : true;
let tipFetchInterval;

document.addEventListener('DOMContentLoaded', () => {
    const startOverlay = document.getElementById('start-overlay');
    const startButton = document.getElementById('start-button');
    const playButton = document.getElementById('play-button');
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const tipText = document.querySelector('.tip-text');
    const skipButton = document.getElementById('skip-button');
    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');
    const loadingLLMToggle = document.getElementById('loading-llm-toggle');
    const startLLMToggle = document.getElementById('start-llm-toggle');
    
    // Hide loading screen initially
    loadingScreen.style.display = 'none';
    
    // Sync the toggle states
    loadingLLMToggle.checked = useLLMTips;
    startLLMToggle.checked = useLLMTips;
    
    // Toggle event listeners
    loadingLLMToggle.addEventListener('change', (e) => {
        useLLMTips = e.target.checked;
        localStorage.setItem('useLLMTips', useLLMTips);
        startLLMToggle.checked = useLLMTips;
        if (tipFetchInterval) {
            clearInterval(tipFetchInterval);
            if (useLLMTips) {
                startLLMTipFetch();
            } else {
                setRandomTip();
            }
        }
    });
    
    startLLMToggle.addEventListener('change', (e) => {
        useLLMTips = e.target.checked;
        localStorage.setItem('useLLMTips', useLLMTips);
        loadingLLMToggle.checked = useLLMTips;
    });
    
    // Setup audio
    bgAudio = new Audio('LLMs Morning Oasis - Sonauto.wav');
    bgAudio.loop = true;
    bgAudio.volume = 0; // Start with volume at 0
    
    // Fade in audio function
    function fadeInAudio(duration = 5000) {
        const targetVolume = 1.0;
        const fadeSteps = 50; // More steps for smoother transition
        const volumeStep = targetVolume / fadeSteps;
        const intervalTime = duration / fadeSteps;
        
        const fadeInterval = setInterval(() => {
            if (bgAudio.volume < (targetVolume - volumeStep)) {
                bgAudio.volume += volumeStep;
            } else {
                bgAudio.volume = targetVolume;
                clearInterval(fadeInterval);
            }
        }, intervalTime);
    }
    
    // Fade out audio function
    function fadeOutAudio(duration = 3000) {
        const startVolume = bgAudio.volume;
        const fadeSteps = 50; // More steps for smoother transition
        const volumeStep = startVolume / fadeSteps;
        const intervalTime = duration / fadeSteps;
        
        const fadeInterval = setInterval(() => {
            if (bgAudio.volume > volumeStep) {
                bgAudio.volume -= volumeStep;
            } else {
                bgAudio.volume = 0;
                bgAudio.pause();
                clearInterval(fadeInterval);
            }
        }, intervalTime);
    }
    
    // Make fadeOutAudio globally accessible
    window.fadeOutAudio = fadeOutAudio;
    
    // Randomly select a tip from config
    function setRandomTip() {
        const randomIndex = Math.floor(Math.random() * config.loadingTips.length);
        tipText.textContent = config.loadingTips[randomIndex];
    }
    
    // Fetch a random tip from LLM API
    async function fetchLLMTip() {
        try {
            const topics = [
                "virtual pets", "AI companions", "language models", "digital cities",
                "model training", "AI personalities", "token economics", "context windows",
                "prompt engineering", "fine-tuning", "hallucinations", "AI creativity",
                "neural networks", "LLM lifecycle", "model parameters", "AI city building"
            ];
            
            // Get 2-3 random topics to include in the prompt
            const randomTopics = [];
            const numTopics = Math.floor(Math.random() * 2) + 2; // 2-3 topics
            
            while (randomTopics.length < numTopics) {
                const randomIndex = Math.floor(Math.random() * topics.length);
                const topic = topics[randomIndex];
                if (!randomTopics.includes(topic)) {
                    randomTopics.push(topic);
                }
            }
            
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Generate a single sentence tip about ${randomTopics.join(", ")} in the context of a simulation game called "The LLMs" where players manage AI entities in a virtual city. Keep it concise, fun and helpful for beginners. Respond with just the tip text, no additional formatting or explanation.`
                    }
                ]
            });
            
            return completion.content.trim();
        } catch (error) {
            console.error("Error fetching LLM tip:", error);
            return "LLMs sometimes need a moment to think!";
        }
    }
    
    // Start the LLM tip fetching cycle
    function startLLMTipFetch() {
        // Fetch first tip immediately
        if (useLLMTips) {
            fetchLLMTip().then(tip => {
                tipText.textContent = tip;
            });
        }
        
        // Set interval for fetching tips every 7 seconds
        tipFetchInterval = setInterval(() => {
            if (useLLMTips) {
                fetchLLMTip().then(tip => {
                    tipText.textContent = tip;
                });
            } else {
                setRandomTip();
            }
        }, 7000);
    }
    
    // Set initial tip based on toggle state
    if (useLLMTips) {
        // Don't start fetching until loading begins
    } else {
        setRandomTip();
    }
    
    // Function to complete loading and show game
    function completeLoading() {
        // Clear the tip fetch interval when loading completes
        if (tipFetchInterval) {
            clearInterval(tipFetchInterval);
        }
        
        fadeOutAudio();
        loadingScreen.style.display = 'none';
        gameContainer.classList.remove('hidden');
    }
    
    // Start experience button
    startButton.addEventListener('click', () => {
        startOverlay.style.display = 'none';
        loadingScreen.style.display = 'flex';
        bgAudio.play();
        fadeInAudio(); // Start fade in effect
        startLoading();
        
        // Start the tip fetching based on toggle state
        if (useLLMTips) {
            startLLMTipFetch();
        } else {
            // Change tip every 3 seconds if using preset tips
            setInterval(setRandomTip, 3000);
        }
    });
    
    // Add play button click handler
    playButton.addEventListener('click', () => {
        startOverlay.style.display = 'none';
        loadingScreen.style.display = 'flex';
        bgAudio.play();
        fadeInAudio(); // Start fade in effect
        startLoading();
        
        // Start the tip fetching based on toggle state
        if (useLLMTips) {
            startLLMTipFetch();
        } else {
            // Change tip every 3 seconds if using preset tips
            setInterval(setRandomTip, 3000);
        }
    });
    
    // Skip button click handler
    skipButton.addEventListener('click', () => {
        clearInterval(loadingInterval);
        if (tipFetchInterval) {
            clearInterval(tipFetchInterval);
        }
        fadeOutAudio();
        completeLoading();
    });
    
    let loadingInterval;
    
    // Start the loading process
    function startLoading() {
        // Simulate loading progress
        let progress = 0;
        const interval = 50; // Update every 50ms
        const increment = (interval / config.loadingTime) * 100;
        
        loadingInterval = setInterval(() => {
            progress += increment;
            
            if (progress >= 100) {
                progress = 100;
                clearInterval(loadingInterval);
                
                // Show the game after a short delay
                setTimeout(completeLoading, 1000);
            }
            
            loadingBar.style.width = `${progress}%`;
            loadingPercentage.textContent = `${Math.round(progress)}%`;
        }, interval);
    }
    
    // Setup console panel functionality
    function setupConsolePanel() {
        const consolePanel = document.getElementById('console-panel');
        const closeButton = document.querySelector('.console-close');
        const exportButton = document.getElementById('export-data');
        const importButton = document.getElementById('import-data');
        const consoleContent = document.querySelector('.console-content');
        const consoleIndicator = document.querySelector('.console-indicator');
        
        // Show console indicator briefly
        setTimeout(() => {
            consoleIndicator.classList.add('visible');
            setTimeout(() => {
                consoleIndicator.classList.remove('visible');
            }, 3000);
        }, 5000);
        
        closeButton.addEventListener('click', () => {
            consolePanel.classList.add('hidden');
        });
        
        exportButton.addEventListener('click', () => {
            const gameData = cityData.saveGame();
            
            // Create a downloadable file
            const blob = new Blob([gameData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `promptopia_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
            
            consoleContent.innerHTML += `<p>Exported city data: ${new Date().toLocaleTimeString()}</p>`;
        });
        
        importButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = e => {
                const file = e.target.files[0];
                const reader = new FileReader();
                
                reader.onload = event => {
                    const result = cityData.loadGame(event.target.result);
                    if (result) {
                        consoleContent.innerHTML += `<p>Successfully imported city data</p>`;
                        // Reload the scene to reflect changes
                        location.reload();
                    } else {
                        consoleContent.innerHTML += `<p>Error importing city data</p>`;
                    }
                };
                
                reader.readAsText(file);
            };
            
            input.click();
        });
    }

    function setupUIInteractions() {
        const createLLMButton = document.querySelector('.create-llm-btn');
        const moveLLMButton = document.querySelector('.move-llm-btn');
        const createLLMUI = document.getElementById('create-llm-ui');
        const closeCreateLLMButton = document.querySelector('.create-llm-close');
        
        createLLMButton.addEventListener('click', () => {
            console.log('Create new LLM clicked');
            createLLMUI.classList.add('active');
            setupLLMCreationInterface();
        });
        
        closeCreateLLMButton.addEventListener('click', () => {
            createLLMUI.classList.remove('active');
        });
        
        moveLLMButton.addEventListener('click', () => {
            console.log('Move LLMs in clicked');
        });
        
        // Add mousemove event for fireworks effect
        createLLMButton.addEventListener('mousemove', (e) => {
            const rect = createLLMButton.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            createLLMButton.style.setProperty('--x', `${x}%`);
            createLLMButton.style.setProperty('--y', `${y}%`);
        });
        
        // Add mousemove event for fireworks effect on move button
        moveLLMButton.addEventListener('mousemove', (e) => {
            const rect = moveLLMButton.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            moveLLMButton.style.setProperty('--x', `${x}%`);
            moveLLMButton.style.setProperty('--y', `${y}%`);
        });
        
        // Setup attribute slider displays
        const sliders = document.querySelectorAll('.setting-slider');
        sliders.forEach(slider => {
            const valueDisplay = document.getElementById(`${slider.id.split('-')[1]}-value`);
            slider.addEventListener('input', () => {
                valueDisplay.textContent = slider.value;
            });
        });
    }

    let humanoidScene, humanoidCamera, humanoidRenderer, humanoidMixer, humanoidClock;
    let robotModel, headMaterial, bodyMaterial, limbsMaterial;

    function setupLLMCreationInterface() {
        // Setup default values for the form
        document.getElementById('llm-name').value = `LLM-${Math.floor(Math.random() * 1000)}`;
        
        // Add event listeners for form elements that should update the humanoid preview
        document.getElementById('llm-color').addEventListener('input', updateHumanoidPreview);
        document.getElementById('llm-style').addEventListener('change', updateHumanoidPreview);
        
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
    
    setupConsolePanel();
    setupUIInteractions();
});