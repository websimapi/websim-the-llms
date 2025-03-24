// Manages consistent styling and appearance of LLM characters across the application
export const characterStyleManager = {
    // Apply consistent materials and styling to a character model
    applyConsistentStyling(THREE, model, llm) {
        const color = new THREE.Color(llm.color || '#3cb371');
        const style = llm.style || 'modern';
        
        // Define material properties based on style
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
        
        // Apply materials to all meshes in the model
        model.traverse(child => {
            if (child.isMesh) {
                // Different material types for different parts
                if (child.name === 'head' || child.name.includes('hand')) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: color,
                        emissive: color.clone().multiplyScalar(0.3),
                        emissiveIntensity: emissiveIntensity,
                        metalness: metalness + 0.2,
                        roughness: roughness - 0.1
                    });
                } else if (child.name === 'body' || child.name === 'torso' || child.name === 'hip') {
                    child.material = new THREE.MeshStandardMaterial({
                        color: color.clone().multiplyScalar(0.8),
                        emissive: color.clone().multiplyScalar(0.2),
                        emissiveIntensity: emissiveIntensity,
                        metalness: metalness,
                        roughness: roughness
                    });
                } else if (child.name.includes('eye')) {
                    child.material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
                } else if (child.name === 'antenna-tip') {
                    child.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                } else if (child.name === 'chest-light') {
                    child.material = new THREE.MeshBasicMaterial({ 
                        color: color.clone().multiplyScalar(1.5)
                    });
                } else {
                    // Default for limbs and other parts
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x444444,
                        emissive: color.clone().multiplyScalar(0.1),
                        emissiveIntensity: emissiveIntensity,
                        metalness: metalness + 0.3,
                        roughness: roughness + 0.1
                    });
                }
                
                // Ensure shadows are enabled
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        return model;
    },
    
    // Function to fix arm rotations to ensure consistency
    fixArmRotations(model) {
        model.traverse(child => {
            if (child.isMesh) {
                // Fix left arm rotations
                if (child.name === 'left-upper-arm') {
                    child.rotation.z = -Math.PI / 6;
                }
                else if (child.name === 'left-lower-arm') {
                    child.rotation.z = -Math.PI / 4;
                }
                // Fix right arm rotations
                else if (child.name === 'right-upper-arm') {
                    child.rotation.z = Math.PI / 6;
                }
                else if (child.name === 'right-lower-arm') {
                    child.rotation.z = Math.PI / 4;
                }
            }
        });
        
        return model;
    }
};