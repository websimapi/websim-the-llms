import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { config } from './config.js';
import { cityData } from './cityData.js';
import { setupSceneLighting } from './advancedLighting.js';
import { createPlotOutline } from './plotConstructionElements.js';
import { createInfiniteTerrain } from './infiniteTerrain.js';
import { CameraBoundaryController } from './cameraBoundaryController.js';
import { createDistanceMist } from './terrainUtils.js';
import { setupUIInteractions, setupConsolePanel } from './citySceneUI.js';
import { initPlotHoverInfo } from './plotHoverInfo.js';
import { llmDataManager } from './llmDataManager.js'; 
import { renderLLMCharacter } from './llmCharacterRenderer.js'; 
import { createNameLabel } from './llmDroneTransport.js'; 


// Expose main scene components globally or via getters for drone transport
let scene, camera, controls, renderer;
window.cityScene = scene; 
window.camera = camera;
window.controls = controls;

// Add fadeOutAudio function at global level
function fadeOutAudio(duration = 3000) {
    const audio = document.querySelector('audio');
    if (!audio) return;

    const startVolume = audio.volume;
    const fadeSteps = 50;
    const volumeStep = startVolume / fadeSteps;
    const intervalTime = duration / fadeSteps;

    const fadeInterval = setInterval(() => {
        if (audio.volume > volumeStep) {
            audio.volume -= volumeStep;
        } else {
            audio.volume = 0;
            audio.pause();
            clearInterval(fadeInterval);
        }
    }, intervalTime);
}

document.addEventListener('DOMContentLoaded', () => {
    window.fadeOutAudio = fadeOutAudio;

    const gameContainer = document.getElementById('game-container');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (!gameContainer.classList.contains('hidden')) {
                    initCityScene();
                    observer.disconnect();
                }
            }
        });
    });

    observer.observe(gameContainer, { attributes: true });

    if (!gameContainer.classList.contains('hidden')) {
        initCityScene();
        observer.disconnect();
    }
});

function initCityScene() {
    const cityViewElement = document.getElementById('city-view');
    while (cityViewElement.firstChild) {
        cityViewElement.removeChild(cityViewElement.firstChild);
    }

    scene = new THREE.Scene(); 
    scene.background = new THREE.Color(0xe0f5e0);
    window.cityScene = scene; 

    camera = new THREE.PerspectiveCamera( 
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        5000 
    );
    window.camera = camera; 

    camera.position.set(50, 30, 50);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    renderer.outputColorSpace = THREE.SRGBColorSpace; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping; 
    renderer.toneMappingExposure = 1.2; 
    cityViewElement.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement); 
    window.controls = controls; 

    const terrain = createInfiniteTerrain(scene, config.primaryGroundSize || 500); 

    const mistLayers = createDistanceMist(scene, (config.primaryGroundSize || 500) * 5, 60); 

    const boundaryController = new CameraBoundaryController(camera, controls, terrain.bounds);

    const gridHelper = new THREE.GridHelper(config.primaryGroundSize || 500, (config.primaryGroundSize || 500) / 10, 0x000000, 0x555555); 
    gridHelper.position.y = 0.01; 
    scene.add(gridHelper);

    gridHelper.visible = false;

    window.cityGrid = gridHelper;

    createBuildingLotsAndPlaceLLMs(scene); 

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5; 
    controls.maxDistance = (config.primaryGroundSize || 500) * 0.7; 
    controls.maxPolarAngle = Math.PI / 2.1; 
    controls.enabled = false; 

    setupSceneLighting(scene, renderer);

    setupUIInteractions();
    setupConsolePanel();

    let introDuration = 4000; 
    let introStartTime = Date.now();
    let introComplete = false;
    let audioFadeStarted = false;

    initPlotHoverInfo(camera, scene, renderer);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function animate() {
        requestAnimationFrame(animate);

        const isDroneActive = window.droneActive === true;

        if (!introComplete) {
            const elapsed = Date.now() - introStartTime;
            const progress = Math.min(elapsed / introDuration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); 

            if (progress < 1) {
                const startPos = new THREE.Vector3(50, 30, 50);
                const endPos = new THREE.Vector3(15, 25, 30);
                camera.position.lerpVectors(startPos, endPos, easeProgress);
                camera.lookAt(0, 0, 0);
            } else {
                introComplete = true;
                if (!isDroneActive) controls.enabled = true; 
            }
        } else if (!isDroneActive) { 
            if (controls.enabled) { 
                controls.update();
                boundaryController.update();
            }
        } else { 
            controls.enabled = false;
        }

        scene.traverse(object => {
            if (object.name === "LLMNameLabel" && object.isSprite) {
                object.quaternion.copy(camera.quaternion);
            }
        });

        if (window.cityAnimateLightsFn) {
            window.cityAnimateLightsFn();
        }

        renderer.render(scene, camera);
    }

    animate(); 
}

function createBuildingLotsAndPlaceLLMs(scene) {
    const lots = cityData.lots;

    const objectsToRemove = [];
    scene.traverse(obj => {
        if ((obj.userData && obj.userData.type === 'lot') || (obj.userData && obj.userData.isPlacedLLM)) {
            objectsToRemove.push(obj);
        }
    });
    objectsToRemove.forEach(obj => {
         obj.traverse(child => {
             if (child.isMesh) {
                 child.geometry.dispose();
                 if (child.material.isMaterial) {
                      if (Array.isArray(child.material)) {
                          child.material.forEach(material => material.dispose());
                      } else {
                          child.material.dispose();
                      }
                 }
             } else if (child.isSprite) {
                 child.material.map?.dispose(); 
                 child.material.dispose();
             }
         });
         if (obj.parent) obj.parent.remove(obj);
     });

    lots.forEach(lot => {
        if (lot.available) {
            const plotOutline = createPlotOutline(lot, scene);
            plotOutline.userData = { type: 'lot', id: lot.id }; 
        } else if (lot.occupiedBy) {
            const llm = llmDataManager.getLLMById(lot.occupiedBy);
            if (llm) {
                const placedLLMModel = renderLLMCharacter(THREE, llm);
                placedLLMModel.position.set(lot.x, 0, lot.z); 

                const directionToCenter = new THREE.Vector3(0 - lot.x, 0, 0 - lot.z).normalize();
                placedLLMModel.rotation.y = Math.atan2(directionToCenter.x, directionToCenter.z);

                placedLLMModel.castShadow = true;
                placedLLMModel.receiveShadow = true;
                placedLLMModel.userData.isPlacedLLM = true; 
                placedLLMModel.userData.llmId = llm.id; 

                const nameLabel = createNameLabel(llm.name, llm.color);
                nameLabel.position.set(0, 1.8, 0); 
                placedLLMModel.add(nameLabel);

                scene.add(placedLLMModel);
                lot.placedModel = placedLLMModel; 
            } else {
                console.warn(`LLM data for ID ${lot.occupiedBy} not found. Making plot ${lot.id} available.`);
                lot.available = true;
                lot.occupiedBy = null;
                lot.placedModel = null;
                const plotOutline = createPlotOutline(lot, scene);
                plotOutline.userData = { type: 'lot', id: lot.id };
            }
        }
    });

    if (!scene.getObjectByName("CitySign")) { 
        addCityNameText(scene);
    }
}

function addCityNameText(scene) {
    const pillarGeometry = new THREE.BoxGeometry(1, 10, 1);
    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.2
    });

    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    leftPillar.position.set(-8, 5, -30);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;

    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(8, 5, -30);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;

    const canvasWithText = document.createElement('canvas');
    canvasWithText.width = 512;
    canvasWithText.height = 128;
    const contextWithText = canvasWithText.getContext('2d');

    const canvasBlank = document.createElement('canvas');
    canvasBlank.width = 512;
    canvasBlank.height = 128;
    const contextBlank = canvasBlank.getContext('2d');

    [contextWithText, contextBlank].forEach(context => {
        context.fillStyle = '#8B4513';
        context.fillRect(0, 0, canvasWithText.width, canvasWithText.height);

        context.strokeStyle = '#6B3100';
        context.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
            context.beginPath();
            context.moveTo(0, i * 15);
            context.bezierCurveTo(
                canvasWithText.width * 0.3, i * 15 + (Math.random() * 10 - 5),
                canvasWithText.width * 0.7, i * 15 + (Math.random() * 10 - 5),
                canvasWithText.width, i * 15
            );
            context.stroke();
        }
    });

    contextWithText.fillStyle = 'white';
    contextWithText.font = 'bold 60px Arial';
    contextWithText.textAlign = 'center';
    contextWithText.textBaseline = 'middle';
    contextWithText.strokeStyle = 'black';
    contextWithText.lineWidth = 4;
    contextWithText.strokeText(cityData.name, canvasWithText.width / 2, canvasWithText.height / 2);
    contextWithText.fillText(cityData.name, canvasWithText.width / 2, canvasWithText.height / 2);

    const textureWithText = new THREE.CanvasTexture(canvasWithText);
    const textureBlank = new THREE.CanvasTexture(canvasBlank);

    const frontBackMaterial = new THREE.MeshStandardMaterial({ 
        map: textureWithText,
        side: THREE.FrontSide,
        roughness: 0.7,
        metalness: 0.1
    });

    const sideMaterial = new THREE.MeshStandardMaterial({ 
        map: textureBlank,
        side: THREE.FrontSide,
        roughness: 0.7,
        metalness: 0.1
    });

    const materials = [
        sideMaterial,       
        sideMaterial,       
        sideMaterial,       
        sideMaterial,       
        frontBackMaterial,  
        frontBackMaterial   
    ];

    const geometry = new THREE.BoxGeometry(20, 5, 0.5);
    const sign = new THREE.Mesh(geometry, materials);
    sign.position.set(0, 8.5, -30);
    sign.castShadow = true;
    scene.add(sign);

    const signGroup = new THREE.Group(); 
    signGroup.name = "CitySign";

    signGroup.add(leftPillar);
    signGroup.add(rightPillar);
    signGroup.add(sign);

    scene.add(signGroup); 
}

export function toggleConsolePanel() {
    const consolePanel = document.getElementById('console-panel');
    if (consolePanel.classList.contains('hidden')) {
        consolePanel.classList.remove('hidden');
    } else {
        consolePanel.classList.add('hidden');
    }
}