import * as THREE from 'three';

// Add enhanced lighting effects to the city scene
export function setupCityLighting(scene) {
    // Remove any existing lights first
    scene.children = scene.children.filter(child => !(child instanceof THREE.Light));
    
    // Add ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Add hemisphere light for sky/ground color gradation
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3cb371, 0.6);
    scene.add(hemisphereLight);
    
    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xFFFFCC, 0.8);
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    
    // Improve shadow quality and coverage
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.bias = -0.0003;
    
    scene.add(directionalLight);
    
    // Add fill light from the opposite direction
    const fillLight = new THREE.DirectionalLight(0xCCDDFF, 0.3);
    fillLight.position.set(-50, 50, -100);
    scene.add(fillLight);
    
    // Add a soft spotlight for highlighting the center area
    const spotlight = new THREE.SpotLight(0xffffff, 0.5);
    spotlight.position.set(0, 60, 0);
    spotlight.target.position.set(0, 0, 0);
    spotlight.angle = Math.PI / 4;
    spotlight.penumbra = 0.5;
    spotlight.decay = 1.5;
    spotlight.distance = 200;
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    scene.add(spotlight);
    scene.add(spotlight.target);
    
    return {
        directionalLight,
        spotlight,
        updateLighting: (time) => {
            // Animate sun position over time if desired
            if (time !== undefined) {
                const angle = time * 0.1;
                directionalLight.position.x = Math.cos(angle) * 50;
                directionalLight.position.z = Math.sin(angle) * 50;
            }
        }
    };
}

// Apply shadows to objects in the scene
export function setupShadows(scene) {
    scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
}

// Add post-processing effects for improved lighting quality
export function setupPostProcessing(scene, camera, renderer) {
    let composer;
    
    // Import the post-processing modules
    import('three/addons/postprocessing/EffectComposer.js').then(({ EffectComposer }) => {
        import('three/addons/postprocessing/RenderPass.js').then(({ RenderPass }) => {
            import('three/addons/postprocessing/SSAOPass.js').then(({ SSAOPass }) => {
                
                // Create composer with render pass
                composer = new EffectComposer(renderer);
                const renderPass = new RenderPass(scene, camera);
                composer.addPass(renderPass);
                
                // Add SSAO (Screen Space Ambient Occlusion) for better depth
                const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
                ssaoPass.kernelRadius = 16;
                ssaoPass.minDistance = 0.005;
                ssaoPass.maxDistance = 0.1;
                composer.addPass(ssaoPass);
                
                // Return the composer for animation loop
                return composer;
            });
        });
    }).catch(error => {
        console.warn('Post-processing not available:', error);
        return null;
    });
    
    return {
        render: () => {
            if (composer) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        }
    };
}
