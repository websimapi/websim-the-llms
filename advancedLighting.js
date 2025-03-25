import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';

export function setupAdvancedLighting(scene, camera, renderer, options = {}) {
    // Configure default options
    const config = {
        enableSSAO: true,
        enableBloom: true,
        bloomStrength: 0.35, 
        bloomRadius: 0.3,    
        bloomThreshold: 0.85,
        shadowMapSize: 2048,
        shadowBias: -0.0005, 
        ...options
    };
    
    // Set up shadow map with better quality settings
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Add directional light with shadows (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = true;
    
    // Configure shadow properties with higher resolution
    directionalLight.shadow.mapSize.width = config.shadowMapSize;
    directionalLight.shadow.mapSize.height = config.shadowMapSize;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.bias = config.shadowBias;
    directionalLight.shadow.normalBias = 0.02; 
    
    // Set up shadow camera frustum to cover scene
    const shadowSize = 100;
    directionalLight.shadow.camera.left = -shadowSize;
    directionalLight.shadow.camera.right = shadowSize;
    directionalLight.shadow.camera.top = shadowSize;
    directionalLight.shadow.camera.bottom = -shadowSize;
    
    scene.add(directionalLight);
    
    // Add hemisphere light for realistic sky/ground reflection
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3D5E3D, 0.6);
    scene.add(hemisphereLight);
    
    // Add some point lights around key areas
    function addPointLight(x, z, color = 0xFFFFFF, intensity = 1, distance = 25) {
        const pointLight = new THREE.PointLight(color, intensity, distance);
        pointLight.position.set(x, 5, z);
        pointLight.castShadow = true;
        pointLight.shadow.bias = config.shadowBias;
        scene.add(pointLight);
        return pointLight;
    }
    
    // Add point lights at key positions
    const centerLight = addPointLight(0, 0, 0xFFEECC, 1.2);
    addPointLight(-25, 0, 0xCCEEFF, 0.8);
    addPointLight(25, 0, 0xEEFFCC, 0.8);
    addPointLight(0, -25, 0xFFDDEE, 0.8);
    
    // Setup post-processing effects
    let composer = null;
    
    if (config.enableSSAO || config.enableBloom) {
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        
        // Add SSAO (ambient occlusion) for depth
        if (config.enableSSAO) {
            const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
            ssaoPass.kernelRadius = 16;
            ssaoPass.minDistance = 0.005;
            ssaoPass.maxDistance = 0.1;
            composer.addPass(ssaoPass);
        }
        
        // Add bloom effect for glow
        if (config.enableBloom) {
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                config.bloomStrength,
                config.bloomRadius,
                config.bloomThreshold
            );
            // Add selective bloom to reduce fuzziness
            bloomPass.threshold = config.bloomThreshold;
            bloomPass.strength = config.bloomStrength;
            bloomPass.radius = config.bloomRadius;
            composer.addPass(bloomPass);
        }
    }
    
    // Handle window resize
    const handleResize = () => {
        if (composer) {
            composer.setSize(window.innerWidth, window.innerHeight);
        }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Return created lights and composer for animation loop
    return { 
        directionalLight,
        hemisphereLight,
        centerLight,
        composer,
        render: function(delta) {
            if (composer) {
                composer.render(delta);
            } else {
                renderer.render(scene, camera);
            }
        }
    };
}