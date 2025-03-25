// New file for environment effects including terrain, water, and sky
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';

let sky, sun, water, environmentScene;
let mountainMesh, beachMesh;
let dayNightCycle;
let time = 0;

export function setupEnvironment(scene, renderer) {
    environmentScene = scene;
    
    // Add sky
    setupSky();
    
    // Add water
    setupWater(renderer);
    
    // Add terrain
    setupTerrain();
    
    // Start day/night cycle
    startDayNightCycle();
}

function setupSky() {
    // Create sky
    sky = new Sky();
    sky.scale.setScalar(10000);
    environmentScene.add(sky);
    
    // Add sun
    sun = new THREE.Vector3();
    
    // Setup sky parameters
    const effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        elevation: 45, // Start at mid-day
        azimuth: 180,
        exposure: renderer.toneMappingExposure
    };
    
    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = effectController.turbidity;
    uniforms['rayleigh'].value = effectController.rayleigh;
    uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;
    
    // Initial position
    updateSunPosition(effectController.elevation, effectController.azimuth);
}

function updateSunPosition(elevation, azimuth) {
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    
    sun.setFromSphericalCoords(1, phi, theta);
    
    sky.material.uniforms['sunPosition'].value.copy(sun);
    
    // Also update water if available
    if (water) {
        water.material.uniforms['sunDirection'].value.copy(sun).normalize();
    }
    
    // Update scene lighting based on sun position
    updateSceneLighting(elevation);
}

function updateSceneLighting(elevation) {
    // Get existing lights from the scene
    const directionalLight = environmentScene.children.find(child => 
        child.type === 'DirectionalLight');
    const ambientLight = environmentScene.children.find(child => 
        child.type === 'AmbientLight');
    
    if (directionalLight && ambientLight) {
        // Set light intensity based on sun elevation
        let sunIntensity = Math.max(0, Math.min(1, (elevation - 10) / 80));
        directionalLight.intensity = 0.8 * sunIntensity;
        ambientLight.intensity = 0.2 + (0.4 * sunIntensity);
        
        // Update directional light position
        directionalLight.position.copy(sun).multiplyScalar(10);
        
        // Color temperature changes based on time of day
        if (elevation < 15) {
            // Dawn/dusk warm light
            directionalLight.color.setRGB(1.0, 0.7, 0.4);
        } else if (elevation < 30) {
            // Morning/afternoon light
            directionalLight.color.setRGB(1.0, 0.9, 0.7);
        } else {
            // Midday light - neutral
            directionalLight.color.setRGB(1.0, 1.0, 1.0);
        }
        
        // Fog color that matches the sky
        const skyColor = getSkyColor(elevation);
        if (environmentScene.fog) {
            environmentScene.fog.color.copy(skyColor);
        } else {
            environmentScene.fog = new THREE.FogExp2(skyColor, 0.005);
        }
        
        // Also update the background color
        environmentScene.background = skyColor;
    }
}

function getSkyColor(elevation) {
    if (elevation < 10) { // Night
        return new THREE.Color(0x0a1a2a);
    } else if (elevation < 20) { // Dawn/dusk
        return new THREE.Color(0xdc7f5f);
    } else if (elevation < 40) { // Morning/afternoon
        return new THREE.Color(0x87ceeb);
    } else { // Midday
        return new THREE.Color(0x4d97ff);
    }
}

function setupWater(renderer) {
    // Create water geometry
    const waterGeometry = new THREE.PlaneGeometry(5000, 5000);
    
    // Create water with reflection and refraction
    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: environmentScene.fog !== undefined
        }
    );
    
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1;
    water.position.z = 70; // Position in front of the city
    
    environmentScene.add(water);
}

function setupTerrain() {
    // Create mountain terrain in the background
    createMountains();
    
    // Create beach terrain connecting to water
    createBeach();
}

function createMountains() {
    const mountainGeometry = new THREE.PlaneGeometry(800, 400, 100, 50);
    const mountainMaterial = new THREE.MeshStandardMaterial({
        color: 0x506850,
        roughness: 0.9,
        metalness: 0.1,
        wireframe: false,
        flatShading: true
    });
    
    // Apply simplex noise to create natural-looking terrain
    const simplex = new SimplexNoise();
    const vertices = mountainGeometry.getAttribute('position').array;
    
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        
        // Create mountain peaks using noise functions
        // Larger scale noise for major mountain features
        const largeScale = simplex.noise(x * 0.01, z * 0.01) * 40;
        // Medium scale noise for smaller features
        const mediumScale = simplex.noise(x * 0.03, z * 0.03) * 15;
        // Small scale noise for small details
        const smallScale = simplex.noise(x * 0.2, z * 0.2) * 5;
        
        // Combine noise at different scales for natural looking terrain
        // Higher towards the back, sloping down towards the front
        let height = largeScale + mediumScale + smallScale;
        
        // Make mountains higher in the back and taper down
        const distanceFromBack = (400 + z) / 800;
        height *= (1 - distanceFromBack * 1.2); 
        
        // Ensure minimum height is below ground level
        height = Math.max(height, -1);
        
        // Apply the calculated height
        vertices[i + 1] = height;
    }
    
    // Update the geometry
    mountainGeometry.getAttribute('position').needsUpdate = true;
    mountainGeometry.computeVertexNormals();
    
    // Create the mountain mesh
    mountainMesh = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountainMesh.position.z = -400; // Place behind the city
    mountainMesh.position.y = -1; // Align with ground
    mountainMesh.rotation.x = -Math.PI / 2;
    mountainMesh.receiveShadow = true;
    
    environmentScene.add(mountainMesh);
}

function createBeach() {
    const beachGeometry = new THREE.PlaneGeometry(300, 140, 50, 30);
    const beachMaterial = new THREE.MeshStandardMaterial({
        color: 0xeecc77,
        roughness: 0.8,
        metalness: 0.1,
        wireframe: false
    });
    
    // Add subtle sand ripples with simplex noise
    const simplex = new SimplexNoise();
    const vertices = beachGeometry.getAttribute('position').array;
    
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        
        // Create subtle sand ripples using high-frequency noise
        const ripples = simplex.noise(x * 0.5, z * 0.5) * 0.5;
        
        // Sloping from water edge up to city level
        const normalizedZ = (z + 70) / 140; // 0 at water's edge, 1 at city edge
        const baseHeight = normalizedZ * 1; // Slope up from water to city
        
        vertices[i + 1] = baseHeight + ripples;
    }
    
    // Update the geometry
    beachGeometry.getAttribute('position').needsUpdate = true;
    beachGeometry.computeVertexNormals();
    
    // Create the beach mesh
    beachMesh = new THREE.Mesh(beachGeometry, beachMaterial);
    beachMesh.position.z = 0; // Between city center and water
    beachMesh.position.y = -1; // Align with ground level
    beachMesh.rotation.x = -Math.PI / 2;
    beachMesh.receiveShadow = true;
    
    environmentScene.add(beachMesh);
}

function startDayNightCycle() {
    const cycleDuration = 300; // Full cycle in seconds
    
    dayNightCycle = setInterval(() => {
        time += 0.1;
        
        // Calculate sun elevation based on time
        // From 0 (night) to 90 (noon) and back to 0
        const elevation = 45 * Math.sin((time % cycleDuration) / cycleDuration * Math.PI * 2) + 45;
        
        // Update sun position
        updateSunPosition(elevation, 180);
        
        // Update water animation
        if (water) {
            water.material.uniforms['time'].value += 1.0 / 60.0;
        }
    }, 100);
}

export function stopDayNightCycle() {
    if (dayNightCycle) {
        clearInterval(dayNightCycle);
    }
}

export function setTimeOfDay(hour) {
    // Map hour (0-23) to elevation (0-90-0)
    let elevation;
    
    if (hour >= 6 && hour <= 18) {
        // Day time: map 6-18 to 0-90-0
        const normalizedHour = (hour - 6) / 12; // 0 to 1
        elevation = Math.sin(normalizedHour * Math.PI) * 90;
    } else if (hour > 18) {
        // Evening: map 18-24 to 0 approaching
        elevation = 5;
    } else {
        // Night: map 0-6 to 0 approaching
        elevation = 5;
    }
    
    // Update sun position
    updateSunPosition(elevation, 180);
}