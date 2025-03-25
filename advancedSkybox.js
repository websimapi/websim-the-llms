import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// Class to manage daylight cycle and skybox
export class DaylightCycle {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.sky = null;
        this.sun = null;
        this.sunLight = null;
        this.timeOfDay = 0.3; // Default to morning (0-1 scale where 0.5 is noon, 0/1 is midnight)
        this.cycleDuration = 600; // Time for a full day-night cycle in seconds
        this.paused = false;
        this.lastTimeUpdate = null;
        this.autoRotate = true;
        
        // Sky parameters
        this.skyParams = {
            turbidity: 10,
            rayleigh: 3,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.75,
            elevation: 45, // Initial sun elevation
            azimuth: 180   // Initial sun azimuth
        };
        
        // Ambient light for night time
        this.ambientLight = new THREE.AmbientLight(0x555566, 0.1);
        this.scene.add(this.ambientLight);
        
        // Store terrain and object materials for color adjustment
        this.terrainMaterials = [];
        this.objectMaterials = [];
    }
    
    // Initialize the sky and sun
    init() {
        // Create a Three.js Sky
        this.sky = new Sky();
        this.sky.scale.setScalar(1000);
        this.scene.add(this.sky);
        
        // Create sun position holder
        this.sun = new THREE.Vector3();
        
        // Add directional light for sun
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.castShadow = true;
        
        // Configure shadow properties
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -70;
        this.sunLight.shadow.camera.right = 70;
        this.sunLight.shadow.camera.top = 70;
        this.sunLight.shadow.camera.bottom = -70;
        this.sunLight.shadow.bias = -0.0005;
        this.sunLight.shadow.normalBias = 0.02;
        
        this.scene.add(this.sunLight);
        
        // Apply initial sky uniform settings
        this.updateSky();
        
        // Begin cycle immediately
        this.lastTimeUpdate = Date.now() / 1000;
    }
    
    // Register materials to be affected by time of day
    registerTerrainMaterial(material) {
        this.terrainMaterials.push(material);
    }
    
    registerObjectMaterial(material) {
        this.objectMaterials.push(material);
    }
    
    // Update time of day
    update() {
        if (this.paused || !this.autoRotate) return;
        
        const currentTime = Date.now() / 1000;
        const delta = currentTime - this.lastTimeUpdate;
        this.lastTimeUpdate = currentTime;
        
        // Update time of day (0-1 scale)
        this.timeOfDay += delta / this.cycleDuration;
        this.timeOfDay %= 1.0; // Loop day
        
        this.updateSky();
    }
    
    // Set specific time of day (0-1)
    setTimeOfDay(time) {
        this.timeOfDay = Math.max(0, Math.min(1, time));
        this.updateSky();
    }
    
    // Control day speed
    setCycleDuration(seconds) {
        this.cycleDuration = Math.max(60, seconds); // Min 1 minute cycle
    }
    
    // Pause/resume day cycle
    togglePause() {
        this.paused = !this.paused;
        if (!this.paused) {
            this.lastTimeUpdate = Date.now() / 1000;
        }
        return this.paused;
    }
    
    // Toggle auto rotation
    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        if (this.autoRotate) {
            this.lastTimeUpdate = Date.now() / 1000;
        }
        return this.autoRotate;
    }
    
    // Update sky and sun position based on time of day
    updateSky() {
        if (!this.sky || !this.sun || !this.sunLight) return;
        
        // Map time of day to sun elevation
        // 0/1 = midnight (-15°), 0.25 = sunrise (0°), 0.5 = noon (90°), 0.75 = sunset (0°)
        let elevation;
        if (this.timeOfDay < 0.25) {
            // Night to sunrise: -15° to 0°
            elevation = -15 + (this.timeOfDay * 60);
        } else if (this.timeOfDay < 0.5) {
            // Sunrise to noon: 0° to 90°
            elevation = ((this.timeOfDay - 0.25) * 360);
        } else if (this.timeOfDay < 0.75) {
            // Noon to sunset: 90° to 0°
            elevation = 90 - ((this.timeOfDay - 0.5) * 360);
        } else {
            // Sunset to night: 0° to -15°
            elevation = -((this.timeOfDay - 0.75) * 60);
        }
        
        this.skyParams.elevation = elevation;
        
        // Calculate azimuth (East to West)
        this.skyParams.azimuth = ((this.timeOfDay * 360) + 180) % 360;
        
        // Calculate sun position from elevation and azimuth
        const phi = THREE.MathUtils.degToRad(90 - this.skyParams.elevation);
        const theta = THREE.MathUtils.degToRad(this.skyParams.azimuth);
        
        this.sun.setFromSphericalCoords(1, phi, theta);
        
        // Update sunlight position and intensity
        this.sunLight.position.copy(this.sun).multiplyScalar(100);
        
        // Update sky uniforms
        const uniforms = this.sky.material.uniforms;
        uniforms['turbidity'].value = this.skyParams.turbidity;
        uniforms['rayleigh'].value = this.skyParams.rayleigh;
        uniforms['mieCoefficient'].value = this.skyParams.mieCoefficient;
        uniforms['mieDirectionalG'].value = this.skyParams.mieDirectionalG;
        uniforms['sunPosition'].value.copy(this.sun).multiplyScalar(100);
        
        // Update sunlight intensity and color based on elevation
        if (elevation > 0) {
            // Daytime
            const intensity = Math.min(1, Math.sin(THREE.MathUtils.degToRad(elevation)) + 0.2);
            this.sunLight.intensity = intensity;
            this.sunLight.color.setHSL(0.1, 0.7, 0.5 + intensity * 0.5); // More yellow at sunrise/sunset
            
            // Fade ambient light
            this.ambientLight.intensity = 0.1 + Math.max(0, 0.5 - intensity * 0.5);
        } else {
            // Nighttime
            this.sunLight.intensity = 0;
            this.ambientLight.intensity = 0.5; // Stronger ambient light at night
        }
        
        // Update terrain and object colors
        this.updateEnvironmentColors();
        
        if (this.renderer) {
            this.renderer.toneMappingExposure = 0.5 + Math.max(0, Math.sin(THREE.MathUtils.degToRad(elevation)));
        }
    }
    
    // Update environment colors based on time of day
    updateEnvironmentColors() {
        // Get sky color
        const skyColor = this.getSkyColorForCurrentTime();
        
        // Update terrain materials
        this.terrainMaterials.forEach(material => {
            if (!material._originalColor) {
                material._originalColor = material.color.clone();
            }
            
            if (this.timeOfDay > 0.25 && this.timeOfDay < 0.75) {
                // Daytime - use original color but slightly tinted by sky
                material.color.copy(material._originalColor);
                material.color.lerp(skyColor, 0.2);
                
                // Increase emissive at golden hour
                if ((this.timeOfDay > 0.25 && this.timeOfDay < 0.3) || 
                    (this.timeOfDay > 0.7 && this.timeOfDay < 0.75)) {
                    if (material.emissive) {
                        material.emissive.setRGB(0.2, 0.1, 0);
                    }
                } else {
                    if (material.emissive) {
                        material.emissive.setRGB(0, 0, 0);
                    }
                }
            } else {
                // Nighttime - darken and blue tint
                material.color.copy(material._originalColor);
                material.color.multiplyScalar(0.5);
                material.color.lerp(new THREE.Color(0x112233), 0.4);
                
                if (material.emissive) {
                    material.emissive.setRGB(0.02, 0.02, 0.04);
                }
            }
        });
        
        // Update object materials (buildings, etc)
        this.objectMaterials.forEach(material => {
            if (!material._originalColor) {
                material._originalColor = material.color.clone();
            }
            
            if (this.timeOfDay > 0.25 && this.timeOfDay < 0.75) {
                // Daytime
                material.color.copy(material._originalColor);
                
                // Golden hour glow
                if ((this.timeOfDay > 0.25 && this.timeOfDay < 0.3) || 
                    (this.timeOfDay > 0.7 && this.timeOfDay < 0.75)) {
                    material.color.lerp(new THREE.Color(0xffcc77), 0.2);
                    if (material.emissive) {
                        material.emissive.setRGB(0.2, 0.1, 0);
                    }
                } else {
                    if (material.emissive) {
                        material.emissive.setRGB(0, 0, 0);
                    }
                }
            } else {
                // Nighttime - darken non-emissive materials
                material.color.copy(material._originalColor);
                material.color.multiplyScalar(0.6);
                
                // Maybe add slight window glow for buildings at night
                if (material.emissive && material.name && material.name.includes('building')) {
                    material.emissive.setRGB(0.1, 0.1, 0.05);
                }
            }
        });
    }
    
    // Get sky color for current time of day
    getSkyColorForCurrentTime() {
        if (this.timeOfDay > 0.75 || this.timeOfDay < 0.25) {
            // Night - dark blue
            return new THREE.Color(0x112244);
        } else if (this.timeOfDay > 0.25 && this.timeOfDay < 0.3) {
            // Sunrise - orange
            return new THREE.Color(0xff9933);
        } else if (this.timeOfDay > 0.3 && this.timeOfDay < 0.7) {
            // Day - blue
            return new THREE.Color(0x88aaff);
        } else {
            // Sunset - orange/red
            return new THREE.Color(0xff6622);
        }
    }
    
    // Create UI controls for manual testing
    createControls(container) {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.top = '10px';
        div.style.right = '10px';
        div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.color = 'white';
        div.style.zIndex = '100';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '1';
        slider.step = '0.01';
        slider.value = this.timeOfDay;
        slider.style.width = '100%';
        
        slider.addEventListener('input', () => {
            this.timeOfDay = parseFloat(slider.value);
            this.paused = true;
            this.updateSky();
            timeLabel.textContent = this.getTimeString();
        });
        
        const autoBtn = document.createElement('button');
        autoBtn.textContent = this.autoRotate ? 'Pause Cycle' : 'Resume Cycle';
        autoBtn.style.marginTop = '10px';
        autoBtn.style.padding = '5px';
        autoBtn.style.width = '100%';
        
        autoBtn.addEventListener('click', () => {
            this.toggleAutoRotate();
            this.paused = !this.autoRotate;
            autoBtn.textContent = this.autoRotate ? 'Pause Cycle' : 'Resume Cycle';
            this.lastTimeUpdate = Date.now() / 1000;
        });
        
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = '60';
        speedSlider.max = '1200';
        speedSlider.step = '60';
        speedSlider.value = this.cycleDuration;
        speedSlider.style.width = '100%';
        speedSlider.style.marginTop = '10px';
        
        const speedLabel = document.createElement('div');
        speedLabel.textContent = `Cycle Speed: ${Math.round(3600/this.cycleDuration)}x`;
        
        speedSlider.addEventListener('input', () => {
            this.cycleDuration = parseInt(speedSlider.value);
            speedLabel.textContent = `Cycle Speed: ${Math.round(3600/this.cycleDuration)}x`;
        });
        
        const timeLabel = document.createElement('div');
        timeLabel.textContent = this.getTimeString();
        
        div.appendChild(timeLabel);
        div.appendChild(slider);
        div.appendChild(autoBtn);
        div.appendChild(speedLabel);
        div.appendChild(speedSlider);
        
        // Add presets
        const addPresetBtn = (text, time) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.margin = '5px';
            btn.style.padding = '3px';
            
            btn.addEventListener('click', () => {
                this.timeOfDay = time;
                slider.value = time;
                this.paused = true;
                this.updateSky();
                timeLabel.textContent = this.getTimeString();
            });
            
            return btn;
        };
        
        const presetContainer = document.createElement('div');
        presetContainer.style.marginTop = '10px';
        presetContainer.style.display = 'flex';
        presetContainer.style.justifyContent = 'space-between';
        
        presetContainer.appendChild(addPresetBtn('Dawn', 0.25));
        presetContainer.appendChild(addPresetBtn('Noon', 0.5));
        presetContainer.appendChild(addPresetBtn('Dusk', 0.75));
        presetContainer.appendChild(addPresetBtn('Night', 0.0));
        
        div.appendChild(presetContainer);
        
        // Update time display on animation frame
        const updateTimeDisplay = () => {
            if (!this.paused && this.autoRotate) {
                timeLabel.textContent = this.getTimeString();
                slider.value = this.timeOfDay;
            }
            requestAnimationFrame(updateTimeDisplay);
        };
        
        updateTimeDisplay();
        
        container.appendChild(div);
    }
    
    // Get time as string (e.g. "12:30 PM")
    getTimeString() {
        // Convert timeOfDay (0-1) to hours and minutes
        const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
        let hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        // Format as 12-hour time
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // Convert 0 to 12
        
        // Add leading zero to minutes if needed
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        
        return `${hours}:${minutesStr} ${period}`;
    }
}
