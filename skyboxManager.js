import * as THREE from 'three';

/**
 * Creates and adds a realistic skybox with clouds to the scene
 * @param {THREE.Scene} scene - The scene to add the skybox to
 */
export function createSkybox(scene) {
    // First method: Sky sphere with gradient and clouds
    createGradientSkySphere(scene);
    
    // Second method: Actual skybox with 6 sides for more realistic distant views
    // Uncomment to use cube skybox instead:
    // createCubeSkybox(scene);
}

/**
 * Creates a gradient sky sphere with procedural clouds
 * @param {THREE.Scene} scene - The scene to add the sky sphere to
 */
function createGradientSkySphere(scene) {
    // Create a large sphere for the sky
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    
    // Flip the geometry inside out
    skyGeometry.scale(-1, 1, 1);
    
    // Create a shader material for sky gradient and clouds
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x0077ff) }, // Sky blue
            bottomColor: { value: new THREE.Color(0xffffff) }, // Horizon white
            offset: { value: 33 },
            exponent: { value: 0.6 },
            time: { value: 0 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            varying vec2 vUv;
            
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            uniform float time;
            
            varying vec3 vWorldPosition;
            varying vec2 vUv;
            
            // Cloud noise functions
            float hash(float n) { return fract(sin(n) * 43758.5453123); }
            
            float noise(vec3 x) {
                vec3 p = floor(x);
                vec3 f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                
                float n = p.x + p.y * 57.0 + p.z * 113.0;
                float res = mix(mix(mix(hash(n), hash(n + 1.0), f.x),
                                   mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
                               mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                                   mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
                return res;
            }
            
            float fbm(vec3 p) {
                float f = 0.0;
                f += 0.5000 * noise(p); p *= 2.01;
                f += 0.2500 * noise(p); p *= 2.02;
                f += 0.1250 * noise(p);
                return f;
            }
            
            void main() {
                // Gradient sky
                float h = normalize(vWorldPosition + offset).y;
                float skyGradient = max(pow(max(h, 0.0), exponent), 0.0);
                vec3 skyColor = mix(bottomColor, topColor, skyGradient);
                
                // Cloud calculation - slower moving clouds
                float cloudSpeed = time * 0.01;
                vec3 cloudCoord = vec3(vUv * 2.0, cloudSpeed);
                float clouds = smoothstep(0.3, 0.7, fbm(cloudCoord));
                
                // Only show clouds in the upper part of the sky and fade to horizon
                float cloudMask = smoothstep(0.0, 0.3, h);
                clouds *= cloudMask;
                
                // Mix sky with clouds
                vec3 finalColor = mix(skyColor, vec3(1.0), clouds * 0.5);
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        side: THREE.BackSide
    });
    
    // Create the sky mesh
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.name = 'sky';
    scene.add(sky);
    
    // Setup animation for clouds
    const clock = new THREE.Clock();
    
    // Add this to the animation loop or create a new one
    function animateSky() {
        const elapsedTime = clock.getElapsedTime();
        skyMaterial.uniforms.time.value = elapsedTime;
        
        // Request next frame
        requestAnimationFrame(animateSky);
    }
    
    // Start the animation
    animateSky();
    
    return sky;
}

/**
 * Creates a 6-sided skybox using image textures
 * @param {THREE.Scene} scene - The scene to add the skybox to
 */
function createCubeSkybox(scene) {
    // Create texture URLs using a generic skybox image set
    // Note: These URLs are placeholders - the actual images need to be hosted somewhere
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('https://threejs.org/examples/textures/cube/skybox/');
    
    const textureCube = loader.load([
        'px.jpg', 'nx.jpg',
        'py.jpg', 'ny.jpg',
        'pz.jpg', 'nz.jpg'
    ]);
    
    // Set the scene background to the cube texture
    scene.background = textureCube;
    
    return textureCube;
}

/**
 * Adds fog to the scene for a more realistic distance effect
 * @param {THREE.Scene} scene - The scene to add fog to
 */
export function addFog(scene) {
    // Add fog to fade out distant objects
    const fogColor = new THREE.Color(0xB8E0F5); // Light blue-ish fog
    const fogNear = 100;
    const fogFar = 300;
    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    
    return scene.fog;
}

/**
 * Adds distant terrain to give the impression of an infinite landscape
 * @param {THREE.Scene} scene - The scene to add terrain to
 */
export function addDistantTerrain(scene) {
    // Create a set of low-poly hills in the far distance
    const terrainGeometry = new THREE.PlaneGeometry(1000, 1000, 20, 20);
    
    // Add some height variation
    const vertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        // Skip center area to leave the playable area flat
        const x = vertices[i];
        const z = vertices[i + 2];
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        if (distFromCenter > 150) {
            // Add hills only in the distance
            vertices[i + 1] = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 15;
        }
    }
    
    // Update the geometry
    terrainGeometry.computeVertexNormals();
    
    // Create terrain material with a nice gradient
    const terrainMaterial = new THREE.MeshStandardMaterial({
        color: 0x54955A,
        roughness: 0.75,
        metalness: 0.1,
        flatShading: true
    });
    
    // Create the mesh and position it below the main ground
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -5; // Just below the main ground
    terrain.receiveShadow = true;
    scene.add(terrain);
    
    return terrain;
}