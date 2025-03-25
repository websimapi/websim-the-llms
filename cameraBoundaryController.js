import * as THREE from 'three';

// Class to manage camera boundaries in the scene
export class CameraBoundaryController {
    constructor(camera, controls, bounds) {
        this.camera = camera;
        this.controls = controls;
        this.bounds = bounds || { min: -250, max: 250 }; // Default bounds
        this.enabled = true;
        
        // Bind methods
        this.update = this.update.bind(this);
        
        // Initialize
        this.originalTarget = controls.target.clone();
        this.lastValidPosition = camera.position.clone();
    }
    
    // Enable or disable boundary control
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    // Update bounds
    setBounds(bounds) {
        this.bounds = bounds;
    }
    
    // Call this method in the animation loop
    update() {
        if (!this.enabled) return;
        
        // Store a reference to the current camera position
        const position = this.camera.position.clone();
        
        // Check if camera is outside bounds (XZ plane only)
        let outsideBounds = false;
        
        // Check X bounds
        if (position.x < this.bounds.min || position.x > this.bounds.max) {
            outsideBounds = true;
        }
        
        // Check Z bounds
        if (position.z < this.bounds.min || position.z > this.bounds.max) {
            outsideBounds = true;
        }
        
        // If outside bounds, reset to last valid position
        if (outsideBounds) {
            // Move camera back to last valid position
            this.camera.position.copy(this.lastValidPosition);
            
            // Reset orbit control target if it's pulled too far
            const targetDist = Math.sqrt(
                this.controls.target.x * this.controls.target.x +
                this.controls.target.z * this.controls.target.z
            );
            
            if (targetDist > Math.abs(this.bounds.max)) {
                this.controls.target.copy(this.originalTarget);
                this.controls.update();
            }
        } else {
            // Update last valid position
            this.lastValidPosition.copy(position);
        }
    }
}