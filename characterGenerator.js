import * as THREE from 'three';

// Function to call AI and generate Three.js code for a character
async function generateCharacterCode(userPrompt, credits = 5) {
    // Determine effort level based on credits
    let effortLevel = "Medium";
    if (credits <= 3) {
        effortLevel = "Low";
    } else if (credits >= 8) {
        effortLevel = "High";
    }

    const systemMessage = `You are an expert Three.js developer specializing in creating visually appealing and structurally sound 3D character models using only built-in Three.js geometries and materials.

Your task is to generate a JavaScript function \`createCharacter(THREE)\` that builds a character model based on the user's description.

**Generation Effort Level: ${effortLevel} (based on ${credits} credits)**

**Core Requirements:**
1.  **Function Format:** The output MUST be a single JavaScript function: \`function createCharacter(THREE) { ... return group; }\`. No other text, explanations, or code outside this function.
2.  **Centering & Scale:** The character MUST be centered approximately at the origin (0,0,0) and be roughly human-proportioned (around 1.7 units tall). Adjust proportions for non-humanoid characters appropriately.
3.  **Geometry & Materials:** Use ONLY built-in Three.js geometries (e.g., BoxGeometry, SphereGeometry, CylinderGeometry, ExtrudeGeometry) and materials (MeshStandardMaterial preferred, MeshBasicMaterial acceptable).
4.  **Structure:** The function must return a single \`THREE.Group\` containing all character parts. Use parent-child relationships logically (e.g., eyes part of the head group, head part of the main group).
5.  **Naming Convention:** CRITICAL - Name EVERY \`THREE.Mesh\` descriptively using the format \`PartType_Description\`. Examples: \`Head_Main\`, \`Body_Torso\`, \`LeftArm_Upper\`, \`RightLeg_Lower\`, \`Feature_Antenna\`, \`Accessory_Cape\`. Use clear and consistent types (Head, Body, LeftArm, RightArm, LeftLeg, RightLeg, Feature, Accessory, etc.). Groups should also be named (e.g., 'Head', 'Torso').
6.  **Positioning:** Position parts logically in 3D space relative to each other. Avoid interpenetration/clipping of parts as much as possible, especially at higher effort levels.
7.  **Completeness:** Ensure the character has a recognizable form based on the prompt, typically including a head, body, and limbs/appendages unless the description clearly indicates otherwise.
8.  **Safety:** The generated code must be safe and contain only Three.js object creation and manipulation. No \`fetch\`, \`eval\`, \`document\`, \`window\`, or other potentially harmful code.
9.  **Creativity:** Be creative with shapes, colors, and material properties (like metalness, roughness) to match the user's description. Use \`MeshStandardMaterial\` properties effectively.

**Effort Level Guidance:**
*   **Low (1-3 credits):** Focus on creating the basic structure and main parts mentioned in the prompt. Correct naming is still important. Simple shapes are acceptable.
*   **Medium (4-7 credits):** Create a well-proportioned character with reasonable detail. Ensure parts connect logically. Use slightly more complex shapes or combinations. Pay close attention to the naming convention for all meshes.
*   **High (8-10+ credits):** Produce a highly detailed and refined model. Actively look for and fix potential issues like part clipping, awkward joint connections, or incorrect proportions *before* outputting the final code. Add subtle details, perhaps using ExtrudeGeometry or combining multiple simple geometries. Ensure perfect adherence to the naming convention and logical hierarchy. The model should look polished.

**Example Part Types:**
*   Head parts: Head_Main, Head_Eyes, Head_Mouth, Head_Ears, Head_Hair, Head_Nose, Head_AntennaBase, Head_AntennaTip
*   Body parts: Body_Torso, Body_Chest, Body_Shoulders, Body_Back, Body_Core, Body_Neck, Body_Pelvis, Body_TailBase, Body_TailMid, Body_TailEnd
*   Arm parts: LeftArm_Upper, LeftArm_Lower, LeftArm_Hand, LeftArm_ShoulderJoint, LeftArm_ElbowJoint, LeftArm_WristJoint, LeftArm_Finger1, LeftArm_Thumb
*   Leg parts: LeftLeg_Upper, LeftLeg_Lower, LeftLeg_Foot, LeftLeg_HipJoint, LeftLeg_KneeJoint, LeftLeg_AnkleJoint, LeftLeg_Toe
*   Feature parts: Feature_Wings, Feature_Horns, Feature_Spikes
*   Accessory parts: Accessory_Helmet, Accessory_Backpack, Accessory_Cape, Accessory_Belt

Generate the \`createCharacter(THREE)\` function now based on the user prompt.
`;


    try {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: `User prompt: "${userPrompt}"` }
            ]
        });

        const codeResponse = completion.content;
        
        // Extract just the function from the response more robustly
        const functionMatch = codeResponse.match(/function\s+createCharacter\s*\(\s*THREE\s*\)\s*\{[\s\S]*?\breturn\s+group\s*;\s*\}/);
        if (!functionMatch) {
             console.error("Raw AI Response:", codeResponse); // Log the raw response for debugging
            throw new Error("Could not find a valid function 'function createCharacter(THREE) {... return group; }' in the generated code. The AI might have included extra text.");
        }
        
        // Basic safety check - look for potentially harmful keywords
        const harmfulKeywords = ['fetch', 'eval', 'document', 'window', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'alert', 'prompt', '<script'];
        const functionCode = functionMatch[0];
        for (const keyword of harmfulKeywords) {
            if (functionCode.includes(keyword)) {
                console.warn(`Potential harmful keyword "${keyword}" detected in generated code.`);
                // Depending on strictness, you might throw an error here
                // throw new Error(`Harmful keyword "${keyword}" detected in generated code.`);
            }
        }

        return functionCode;
    } catch (error) {
        console.error("Error generating character code:", error);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// Function to evaluate the generated code safely and create the character
function createCustomCharacter(THREE, generatedCode) {
    try {
        // Create a safe function from the generated code
        // Use strict mode and pass only THREE
        const createCharacterFn = new Function('THREE', `
            'use strict';
            ${generatedCode}
            // Ensure the function returned is indeed createCharacter
            if (typeof createCharacter !== 'function') {
                 throw new Error('Generated code did not define createCharacter function correctly.');
            }
            return createCharacter(THREE);
        `);
        
        // Execute the function with THREE as parameter
        const character = createCharacterFn(THREE);

        if (!(character instanceof THREE.Group)) {
             throw new Error("Generated function did not return a THREE.Group");
        }
        
        // Add name labels to each part IF they are missing
        let partIndex = 0;
        const missingNames = [];
        character.traverse(child => {
            if (child.isMesh) {
                // Name parts if they don't have names already or have generic names
                if (!child.name || child.name === '' || child.name.startsWith('Mesh_')) {
                    const partType = determineMeshType(child);
                    const uniqueName = `${partType}_${partIndex}`;
                    child.name = uniqueName;
                    missingNames.push(uniqueName);
                    partIndex++;
                }
                 // Ensure material is cloned for individual coloring later
                 if (child.material) {
                    child.material = child.material.clone();
                 }
            } else if (child.isGroup && (!child.name || child.name === '')) {
                 // Optionally name unnamed groups too
                 child.name = `Group_${partIndex}`;
                 partIndex++;
            }
        });

        if (missingNames.length > 0) {
            console.warn(`AI failed to name ${missingNames.length} parts. Assigned default names:`, missingNames);
        }
        
        return character;
    } catch (error) {
        console.error("Error creating custom character:", error);
        console.error("Problematic Code Snippet:\n", generatedCode.substring(0, 500) + "..."); // Log snippet
        return createFallbackCharacter(THREE); // Return fallback
    }
}

// Helper function to determine mesh type based on position and geometry
function determineMeshType(mesh) {
    // Basic check based on common names from AI
    if (mesh.name) {
        if (mesh.name.toLowerCase().includes("head")) return "Head";
        if (mesh.name.toLowerCase().includes("body") || mesh.name.toLowerCase().includes("torso")) return "Body";
        if (mesh.name.toLowerCase().includes("arm")) return "Arm";
        if (mesh.name.toLowerCase().includes("leg")) return "Leg";
        if (mesh.name.toLowerCase().includes("foot")) return "Foot";
        if (mesh.name.toLowerCase().includes("hand")) return "Hand";
    }

    // Position-based detection (less reliable but a fallback)
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);

    // Use rough height estimates assuming ~1.7 unit tall character centered at origin
    if (worldPosition.y > 1.2) return "Head";
    if (worldPosition.y > 0.5) return "Body";
    if (worldPosition.y > -0.1) { // Check X position for limbs
        if (Math.abs(worldPosition.x) > 0.1) {
            return worldPosition.x < 0 ? "LeftLimb" : "RightLimb";
        }
        return "LowerBody"; // Pelvis or upper legs
    }
    if (worldPosition.y <= -0.1) {
         if (Math.abs(worldPosition.x) > 0.1) {
             return worldPosition.x < 0 ? "LeftLeg" : "RightLeg";
         }
         return "Feet";
    }

    // Geometry-based detection fallback
    if (mesh.geometry) {
        const geomType = mesh.geometry.type;
        if (geomType.includes("Sphere")) return "Joint"; // Or maybe head
        if (geomType.includes("Box") || geomType.includes("Cylinder")) return "Segment"; // Body or limb segment
    }

    return "Part"; // Generic fallback
}

// Fallback character in case the generated code fails
function createFallbackCharacter(THREE) {
    console.warn("Creating fallback character due to error in generated code.");
    const group = new THREE.Group();
    group.name = "FallbackCharacter";
    
    // Simple robot-like character
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x6495ED })
    );
    head.position.y = 1.5;
    head.name = "Head_Main";
    group.add(head);
    
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.7, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x4169E1 })
    );
    body.position.y = 1.0;
    body.name = "Body_Torso";
    group.add(body);
    
    const leftArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4169E1 })
    );
    leftArm.position.set(-0.35, 1.0, 0); // Moved slightly out
    // leftArm.rotation.z = Math.PI / 2; // Remove rotation for vertical arm
    leftArm.name = "LeftArm_Upper";
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4169E1 })
    );
    rightArm.position.set(0.35, 1.0, 0); // Moved slightly out
    // rightArm.rotation.z = -Math.PI / 2; // Remove rotation
    rightArm.name = "RightArm_Upper";
    group.add(rightArm);
    
    const leftLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.08, 0.8), // Tapered leg
        new THREE.MeshStandardMaterial({ color: 0x4682B4 })
    );
    leftLeg.position.set(-0.15, 0.4, 0); // Positioned left
    leftLeg.name = "LeftLeg_Upper";
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.08, 0.8), // Tapered leg
        new THREE.MeshStandardMaterial({ color: 0x4682B4 })
    );
    rightLeg.position.set(0.15, 0.4, 0); // Positioned right
    rightLeg.name = "RightLeg_Upper";
    group.add(rightLeg);
    
    return group;
}

export { generateCharacterCode, createCustomCharacter };