import * as THREE from 'three';

// Function to call AI and generate Three.js code for a character
async function generateCharacterCode(selectedEmojis) {
    try {
        // Construct a prompt based on the selected emojis
        const emojiString = selectedEmojis.join(', ');
        const prompt = `Create Three.js code for a character model based on the combination of these emoji concepts: ${emojiString}

The code should be a valid JavaScript function that follows this format:
function createCharacter(THREE) {
    const group = new THREE.Group();
    group.name = "CustomCharacterModel"; // Name the root group

    // *** Animation Rigging Requirements START ***
    // Create the following named THREE.Group objects to act as animation pivots.
    // Attach corresponding body parts to these groups.
    // If a limb doesn't logically exist (e.g., a ghost), create the group but leave it empty or add minimal visual representation.

    // Body Core (adjust geometry/material based on emojis)
    const pelvis = new THREE.Group(); // Base group
    pelvis.name = "Body_Pelvis";
    group.add(pelvis);
    // ... add visual representation for pelvis/core to 'pelvis' group ...

    const torsoGroup = new THREE.Group();
    torsoGroup.name = "TorsoGroup";
    // ... position torsoGroup relative to pelvis ...
    pelvis.add(torsoGroup);
    // ... add visual representation for torso/chest to 'torsoGroup' ...

    const neck = new THREE.Group(); // Use Group for neck pivot
    neck.name = "Body_Neck";
    // ... position neck relative to torsoGroup ...
    torsoGroup.add(neck);
    // ... optional visual representation for neck ...

    const headGroup = new THREE.Group();
    headGroup.name = "HeadGroup";
    // ... position headGroup relative to neck ...
    neck.add(headGroup);
    // ... add visual representation for head to 'headGroup' ...

    // --- Left Arm ---
    const leftShoulderGroup = new THREE.Group();
    leftShoulderGroup.name = "LeftShoulder"; // CRITICAL FOR ANIMATION
    // ... position leftShoulderGroup relative to torsoGroup ...
    torsoGroup.add(leftShoulderGroup);
    // ... add visual upper arm part(s) to 'leftShoulderGroup' ...

    const leftElbowGroup = new THREE.Group();
    leftElbowGroup.name = "LeftElbow"; // CRITICAL FOR ANIMATION
    // ... position leftElbowGroup relative to upper arm end ...
    leftShoulderGroup.add(leftElbowGroup); // Add elbow pivot to shoulder group
    // ... add visual lower arm part(s) to 'leftElbowGroup' ...
    // ... add visual hand part(s) to 'leftElbowGroup' ...

    // --- Right Arm ---
    const rightShoulderGroup = new THREE.Group();
    rightShoulderGroup.name = "RightShoulder"; // CRITICAL FOR ANIMATION
    // ... position rightShoulderGroup relative to torsoGroup ...
    torsoGroup.add(rightShoulderGroup);
    // ... add visual upper arm part(s) to 'rightShoulderGroup' ...

    const rightElbowGroup = new THREE.Group();
    rightElbowGroup.name = "RightElbow"; // CRITICAL FOR ANIMATION
    // ... position rightElbowGroup relative to upper arm end ...
    rightShoulderGroup.add(rightElbowGroup); // Add elbow pivot to shoulder group
    // ... add visual lower arm part(s) to 'rightElbowGroup' ...
    // ... add visual hand part(s) to 'rightElbowGroup' ...

    // --- Left Leg ---
    const leftHipGroup = new THREE.Group();
    leftHipGroup.name = "LeftHip"; // CRITICAL FOR ANIMATION
    // ... position leftHipGroup relative to pelvis ...
    pelvis.add(leftHipGroup);
    // ... add visual upper leg part(s) to 'leftHipGroup' ...

    const leftKneeGroup = new THREE.Group();
    leftKneeGroup.name = "LeftKnee"; // CRITICAL FOR ANIMATION
    // ... position leftKneeGroup relative to upper leg end ...
    leftHipGroup.add(leftKneeGroup); // Add knee pivot to hip group
    // ... add visual lower leg part(s) to 'leftKneeGroup' ...
    // ... add visual foot part(s) to 'leftKneeGroup' ...

    // --- Right Leg ---
    const rightHipGroup = new THREE.Group();
    rightHipGroup.name = "RightHip"; // CRITICAL FOR ANIMATION
    // ... position rightHipGroup relative to pelvis ...
    pelvis.add(rightHipGroup);
    // ... add visual upper leg part(s) to 'rightHipGroup' ...

    const rightKneeGroup = new THREE.Group();
    rightKneeGroup.name = "RightKnee"; // CRITICAL FOR ANIMATION
    // ... position rightKneeGroup relative to upper leg end ...
    rightHipGroup.add(rightKneeGroup); // Add knee pivot to hip group
    // ... add visual lower leg part(s) to 'rightKneeGroup' ...
    // ... add visual foot part(s) to 'rightKneeGroup' ...

    // *** Animation Rigging Requirements END ***


    // Your generated visual code goes here, attaching meshes/parts to the correct RIGGING GROUPS above.

    // --- General Requirements ---
    // 1. Center the entire character group roughly at origin (0,0,0).
    // 2. Keep character proportional to a human (around 1.7 units tall from feet to top of head/feature).
    // 3. Use ONLY Three.js built-in geometries (Box, Sphere, Cylinder, Cone, Plane, Torus, Extrude) and materials (MeshStandardMaterial preferred, MeshBasicMaterial ok).
    // 4. Return the main 'group' (THREE.Group).
    // 5. NO fetch, eval, external libraries, or complex logic.
    // 6. Use colors/shapes creatively based on emoji concepts: ${emojiString}.
    // 7. Give VISUAL parts descriptive names using 'PartType_Description' format (e.g., "Head_Main", "Body_Torso", "LeftArm_Upper", "Feature_CrystalShard"). DO NOT rename the critical animation groups (LeftHip, LeftKnee, etc.).
    // 8. Use consistent VISUAL naming prefixes: Head, Body, LeftArm, RightArm, LeftLeg, RightLeg, Feature.
    // 9. Position parts appropriately. Ensure limbs attach visually to their pivot points.
    // 10. Ensure character has a discernible form (head, body, limbs/features).

    return group;
}

Interpret the emojis as key visual characteristics and combine them into a single, coherent character, adhering STRICTLY to the rigging and naming requirements for animation compatibility.`;

        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: "You are an expert Three.js developer specializing in creating unique 3D character models based on abstract concepts represented by emojis. You MUST follow the provided rigging structure and naming conventions precisely for animation compatibility." },
                { role: "user", content: prompt }
            ]
        });

        const codeResponse = completion.content;

        // Extract just the function from the response
        const functionMatch = codeResponse.match(/function createCharacter\(THREE\) \{[\s\S]*return group;[\s\S]*\}/);
        if (!functionMatch) {
            console.error("Raw LLM Response:", codeResponse); // Log the raw response
            throw new Error("Could not find valid 'function createCharacter(THREE)' block in generated code.");
        }

        // Basic validation: check if critical groups are mentioned in the code
        const requiredGroups = ["LeftShoulder", "LeftElbow", "RightShoulder", "RightElbow", "LeftHip", "LeftKnee", "RightHip", "RightKnee"];
        const generatedCodeString = functionMatch[0];
        let missingGroups = [];
        for (const groupName of requiredGroups) {
            if (!generatedCodeString.includes(groupName)) {
                missingGroups.push(groupName);
            }
        }
        if (missingGroups.length > 0) {
            console.warn(`Generated code might be missing required animation groups: ${missingGroups.join(', ')}. Animation might not work correctly.`);
            // Consider throwing an error or attempting fallback creation here if strict compliance is needed
        }


        return functionMatch[0];
    } catch (error) {
        console.error("Error generating character code:", error);
        throw error; // Re-throw the error to be caught by the caller
    }
}


// Function to evaluate the generated code safely and create the character
function createCustomCharacter(THREE, generatedCode) {
    try {
        // Sanitize code - very basic example, more robust needed for production
        // This is NOT a secure sandbox
        if (generatedCode.includes('fetch(') || generatedCode.includes('eval(') || generatedCode.includes('XMLHttpRequest')) {
            throw new Error("Generated code contains potentially unsafe elements.");
        }

        // Create a safe function from the generated code
        // Ensure THREE is passed correctly
        const createCharacterFn = new Function('THREE', `
            // Ensure THREE is accessible inside the generated function scope
            const scopeTHREE = THREE;
            ${generatedCode}
            // Ensure the function exists before calling
            if (typeof createCharacter !== 'function') {
                throw new Error('Generated code did not define createCharacter function.');
            }
            return createCharacter(scopeTHREE); // Pass the scoped THREE
        `);


        // Execute the function with THREE as parameter
        const character = createCharacterFn(THREE);

        // Validate the returned object
        if (!character || !(character instanceof THREE.Group)) {
            throw new Error("Generated code did not return a valid THREE.Group object.");
        }

        // Ensure the root group has an animations array property
        if (!character.animations) {
            character.animations = [];
        }


        // Add name labels to each VISUAL part (meshes) if missing
        // Avoid renaming the critical animation groups
        const criticalGroupNames = ["LeftShoulder", "LeftElbow", "RightShoulder", "RightElbow", "LeftHip", "LeftKnee", "RightHip", "RightKnee", "Body_Pelvis", "TorsoGroup", "Body_Neck", "HeadGroup"];
        let partIndex = 0;
        character.traverse(child => {
            if (child.isMesh) {
                // Name parts if they don't have names already
                if (!child.name || child.name === '') {
                    const partType = determineMeshType(child);
                    child.name = `${partType}_Mesh_${partIndex}`; // Add 'Mesh' prefix
                    partIndex++;
                }
                 // Ensure meshes cast/receive shadow
                 child.castShadow = true;
                 child.receiveShadow = true;

            } else if (child.isGroup && !child.name) {
                 // Optionally name unnamed groups, but avoid critical ones if they somehow lack names
                 child.name = `UnnamedGroup_${partIndex}`;
                 partIndex++;
            } else if (child.isGroup && criticalGroupNames.includes(child.name)) {
                 // Ensure critical groups have standard properties if needed (like matrixAutoUpdate)
                 child.matrixAutoUpdate = true; // Important for animation updates
            }
        });


        return character;
    } catch (error) {
        console.error("Error creating custom character from generated code:", error);
        // Optional: Log the problematic code
        // console.error("Problematic Code:", generatedCode);
        // Return a fallback character instead of throwing
        return createFallbackCharacter(THREE); // Ensure fallback is animation compatible
    }
}

// Fallback character - MODIFIED to be animation compatible
function createFallbackCharacter(THREE) {
    const group = new THREE.Group();
    group.name = "FallbackCharacterModel";
    group.animations = []; // Ensure animations array exists

    // Standard materials
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x6495ED });
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4169E1 });
    const limbsMaterial = new THREE.MeshStandardMaterial({ color: 0x4682B4 });

    // --- Rigging Structure ---
    const pelvis = new THREE.Group(); pelvis.name = "Body_Pelvis"; group.add(pelvis);
    const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.2), bodyMaterial);
    pelvisMesh.name = "Body_Pelvis_Mesh_0"; pelvis.add(pelvisMesh);

    const torsoGroup = new THREE.Group(); torsoGroup.name = "TorsoGroup"; torsoGroup.position.y = 0.15/2 + 0.7/2; pelvis.add(torsoGroup);
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), bodyMaterial);
    torsoMesh.name = "Body_Torso_Mesh_0"; torsoGroup.add(torsoMesh);

    const neck = new THREE.Group(); neck.name = "Body_Neck"; neck.position.y = 0.7/2 + 0.1/2; torsoGroup.add(neck);
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1), limbsMaterial);
    neckMesh.name = "Body_Neck_Mesh_0"; neck.add(neckMesh);

    const headGroup = new THREE.Group(); headGroup.name = "HeadGroup"; headGroup.position.y = 0.1/2 + 0.3/2; neck.add(headGroup);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), headMaterial);
    headMesh.name = "Head_Main_Mesh_0"; headGroup.add(headMesh);

    // --- Left Arm ---
    const leftShoulderGroup = new THREE.Group(); leftShoulderGroup.name = "LeftShoulder"; leftShoulderGroup.position.set(-0.3, 0.7/2 - 0.1, 0); torsoGroup.add(leftShoulderGroup);
    const leftUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5), limbsMaterial);
    leftUpperArmMesh.name = "LeftArm_Upper_Mesh_0"; leftUpperArmMesh.position.y = -0.25; leftShoulderGroup.add(leftUpperArmMesh);

    const leftElbowGroup = new THREE.Group(); leftElbowGroup.name = "LeftElbow"; leftElbowGroup.position.y = -0.5; leftShoulderGroup.add(leftElbowGroup); // Attach to shoulder group
    const leftLowerArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5), limbsMaterial);
    leftLowerArmMesh.name = "LeftArm_Lower_Mesh_0"; leftLowerArmMesh.position.y = -0.25; leftElbowGroup.add(leftLowerArmMesh);

    // --- Right Arm ---
    const rightShoulderGroup = new THREE.Group(); rightShoulderGroup.name = "RightShoulder"; rightShoulderGroup.position.set(0.3, 0.7/2 - 0.1, 0); torsoGroup.add(rightShoulderGroup);
    const rightUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5), limbsMaterial);
    rightUpperArmMesh.name = "RightArm_Upper_Mesh_0"; rightUpperArmMesh.position.y = -0.25; rightShoulderGroup.add(rightUpperArmMesh);

    const rightElbowGroup = new THREE.Group(); rightElbowGroup.name = "RightElbow"; rightElbowGroup.position.y = -0.5; rightShoulderGroup.add(rightElbowGroup); // Attach to shoulder group
    const rightLowerArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5), limbsMaterial);
    rightLowerArmMesh.name = "RightArm_Lower_Mesh_0"; rightLowerArmMesh.position.y = -0.25; rightElbowGroup.add(rightLowerArmMesh);

    // --- Left Leg ---
    const leftHipGroup = new THREE.Group(); leftHipGroup.name = "LeftHip"; leftHipGroup.position.set(-0.1, -0.15/2, 0); pelvis.add(leftHipGroup);
    const leftUpperLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6), limbsMaterial);
    leftUpperLegMesh.name = "LeftLeg_Upper_Mesh_0"; leftUpperLegMesh.position.y = -0.3; leftHipGroup.add(leftUpperLegMesh);

    const leftKneeGroup = new THREE.Group(); leftKneeGroup.name = "LeftKnee"; leftKneeGroup.position.y = -0.6; leftHipGroup.add(leftKneeGroup); // Attach to hip group
    const leftLowerLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6), limbsMaterial);
    leftLowerLegMesh.name = "LeftLeg_Lower_Mesh_0"; leftLowerLegMesh.position.y = -0.3; leftKneeGroup.add(leftLowerLegMesh);
    const leftFootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), limbsMaterial);
    leftFootMesh.name = "LeftLeg_Foot_Mesh_0"; leftFootMesh.position.y = -0.6; leftKneeGroup.add(leftFootMesh);

    // --- Right Leg ---
    const rightHipGroup = new THREE.Group(); rightHipGroup.name = "RightHip"; rightHipGroup.position.set(0.1, -0.15/2, 0); pelvis.add(rightHipGroup);
    const rightUpperLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6), limbsMaterial);
    rightUpperLegMesh.name = "RightLeg_Upper_Mesh_0"; rightUpperLegMesh.position.y = -0.3; rightHipGroup.add(rightUpperLegMesh);

    const rightKneeGroup = new THREE.Group(); rightKneeGroup.name = "RightKnee"; rightKneeGroup.position.y = -0.6; rightHipGroup.add(rightKneeGroup); // Attach to hip group
    const rightLowerLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6), limbsMaterial);
    rightLowerLegMesh.name = "RightLeg_Lower_Mesh_0"; rightLowerLegMesh.position.y = -0.3; rightKneeGroup.add(rightLowerLegMesh);
    const rightFootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), limbsMaterial);
    rightFootMesh.name = "RightLeg_Foot_Mesh_0"; rightFootMesh.position.y = -0.6; rightKneeGroup.add(rightFootMesh);

     // Add shadows
     group.traverse((child) => {
         if (child.isMesh) {
             child.castShadow = true;
             child.receiveShadow = true;
         }
     });


    return group;
}

// Helper function to determine mesh type based on position and geometry
function determineMeshType(mesh) {
    // Position-based detection
    const position = new THREE.Vector3();
    mesh.getWorldPosition(position); // Get world position directly

    // Y-position based detection (adjust thresholds based on typical model height ~1.7)
    if (position.y > 1.4) { // Increased threshold slightly
        return "Head";
    } else if (position.y > 0.7 && position.y <= 1.4) { // Adjusted range
        return "Body";
    } else if (position.y <= 0.7 && position.y > -0.1) { // Legs/Arms range
        // Check if it's likely an arm based on X position
        if (Math.abs(position.x) > 0.25) { // Increased threshold slightly
            return position.x < 0 ? "LeftArm" : "RightArm";
        }
        // Otherwise assume it's part of the legs/pelvis
        return position.x < 0 ? "LeftLeg" : "RightLeg";
    } else if (position.y <= -0.1) { // Feet or base
        return "Foot"; // Changed from Base to Foot
    }

    // Geometry-based detection fallback (less reliable for complex shapes)
    if (mesh.geometry) {
        const type = mesh.geometry.type;
        if (type.includes("Sphere")) {
            // Could be head, joint, or feature - position is better indicator
            return position.y > 1.4 ? "Head" : "Feature";
        } else if (type.includes("Box") || type.includes("Cylinder") || type.includes("Extrude")) {
             // Could be anything - position is better
             if (position.y > 1.4) return "Head";
             if (position.y > 0.7) return "Body";
             if (Math.abs(position.x) > 0.25) return position.x < 0 ? "LeftArm" : "RightArm";
             return position.x < 0 ? "LeftLeg" : "RightLeg";
        }
    }

    return "Feature"; // Default fallback
}

export { generateCharacterCode, createCustomCharacter };