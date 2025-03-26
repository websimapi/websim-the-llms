import * as THREE from 'three';

// Function to call AI and generate Three.js code for a character
async function generateCharacterCode(userPrompt) {
    try {
        const systemPrompt = `You are an expert Three.js developer specialized in creating visually appealing 3D character models using only THREE.Mesh with built-in geometries (BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, PlaneGeometry) and standard materials (MeshStandardMaterial, MeshBasicMaterial, MeshPhongMaterial).

Your task is to generate a JavaScript function \`createCharacter(THREE)\` based on the user's description.

**Function Requirements:**

1.  **Structure:** The function must accept \`THREE\` as an argument and return a single \`THREE.Group\` instance containing the entire character model.
2.  **Centering & Scale:** The character must be centered around the origin (0, 0, 0) and roughly proportional to a human height (approx. 1.5 to 1.8 units tall). Adjust scale appropriately for non-humanoid characters based on the description.
3.  **Naming Convention:**
    *   **Crucial:** Every significant mesh part MUST have a unique \`name\` property following the format: \`PartType_Description\` (e.g., \`Head_Main\`, \`Body_Torso\`, \`LeftArm_Upper\`, \`RightLeg_Foot\`, \`Feature_Antenna\`, \`Tail_Segment1\`).
    *   Use clear and consistent types: \`Head\`, \`Body\`, \`LeftArm\`, \`RightArm\`, \`LeftLeg\`, \`RightLeg\`, \`Feature\`, \`Tail\`, \`Wing\`, etc.
    *   Use descriptions that are meaningful (e.g., \`Head_EyeLeft\`, \`Body_ChestPlate\`, \`Feature_HornRight\`).
    *   If a part is complex, break it into sub-parts with names (e.g., a hand could have \`LeftArm_HandPalm\`, \`LeftArm_HandThumb\`, \`LeftArm_HandFinger1\`).
4.  **Hierarchy:** Use parent-child relationships within the main group where appropriate (e.g., eyes attached to head, arms attached to torso/shoulders). Position child parts relative to their parent.
5.  **Composition:** Characters should generally include a head/main feature, a body/core, and limbs/appendages relevant to the description (arms, legs, wings, tails, tentacles, etc.).
6.  **Materials:** Use \`MeshStandardMaterial\` primarily for realistic lighting. Use distinct materials for different parts. Be creative with colors and material properties (color, metalness, roughness, emissive) to match the description.
7.  **Safety:** The generated code must be pure Three.js setup. NO external calls, \`eval\`, \`fetch\`, DOM manipulation, or other unsafe constructs.
8.  **Creativity:** Interpret the user prompt creatively while adhering to the technical constraints. If the prompt is vague, make reasonable assumptions to create a complete character.

**Output Format Example:**

\`\`\`javascript
function createCharacter(THREE) {
    const group = new THREE.Group();
    group.name = "CharacterRoot"; // Name the root group

    // --- Head Group ---
    const headGroup = new THREE.Group();
    headGroup.name = "HeadGroup";
    headGroup.position.y = 1.5; // Example positioning
    group.add(headGroup);

    const headMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 })
    );
    headMain.name = "Head_Main";
    headGroup.add(headMain); // Add to head group

    const eyeLeft = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 8),
        new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x55ffff, emissiveIntensity: 0.8 })
    );
    eyeLeft.name = "Head_EyeLeft";
    eyeLeft.position.set(-0.1, 0.05, 0.2); // Position relative to headGroup
    headGroup.add(eyeLeft);

    // --- Body Group ---
    const bodyGroup = new THREE.Group();
    bodyGroup.name = "BodyGroup";
    bodyGroup.position.y = 1.0;
    group.add(bodyGroup);

    const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    torso.name = "Body_Torso";
    bodyGroup.add(torso);

    // --- Left Arm ---
    const leftArmGroup = new THREE.Group();
    leftArmGroup.name = "LeftArmGroup";
    leftArmGroup.position.set(-0.3, 1.2, 0); // Position relative to main group origin
    group.add(leftArmGroup);

    const leftUpperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    leftUpperArm.name = "LeftArm_Upper";
    leftUpperArm.position.y = -0.15; // Position relative to leftArmGroup
    leftArmGroup.add(leftUpperArm);

    // ... other parts ...

    // --- Animal Example Part (Tail) ---
    // const tailGroup = new THREE.Group();
    // tailGroup.name = "TailGroup";
    // tailGroup.position.set(0, 0.8, -0.3); // Example position
    // group.add(tailGroup);
    // const tailSegment1 = new THREE.Mesh(
    //     new THREE.SphereGeometry(0.08, 16, 8),
    //     new THREE.MeshStandardMaterial({ color: 0xcc8855 })
    // );
    // tailSegment1.name = "Tail_Segment1";
    // tailGroup.add(tailSegment1);
    // const tailSegment2 = new THREE.Mesh( /* ... */ );
    // tailSegment2.name = "Tail_Segment2";
    // tailSegment2.position.y = -0.1; // Relative to tailSegment1 or tailGroup
    // tailSegment1.add(tailSegment2); // Example hierarchy within tail

    // --- Final Return ---
    return group;
}
\`\`\`

**Robot Example Snippets (Good Structure):**

*   Head with Eyes & Antenna: Use a group for the head, position eyes and antenna relative to it. Name parts like \`Head_Main\`, \`Head_EyeLeft\`, \`Head_AntennaTip\`.
*   Torso with Chest Light: Use a group, add torso mesh and light mesh. Name parts like \`Body_Torso\`, \`Body_ChestLight\`.
*   Limbs with Joints: Use groups for shoulders/hips or entire limbs. Add upper/lower segments and joint spheres. Name parts like \`LeftArm_Upper\`, \`LeftArm_ElbowJoint\`, \`LeftLeg_KneeJoint\`, \`LeftLeg_Foot\`.

**Animal Example Considerations:**

*   **Quadruped:** Position body lower, adjust leg joints (knees/elbows might bend differently). Add a tail group with segments (\`Tail_Segment1\`, \`Tail_Segment2\`). Use appropriate head shape/features (\`Head_Snout\`, \`Head_EarLeft\`).
*   **Bird:** Create wing groups (\`WingLeftGroup\`). Use \`PlaneGeometry\` or thin \`BoxGeometry\` for feathers/wing surfaces (\`WingLeft_PrimaryFeather1\`). Add a beak (\`Head_Beak\`) and tail feathers (\`Tail_FeatherCenter\`).
*   **Fish:** Body shape likely a stretched sphere or cylinder. Add fins using \`PlaneGeometry\` or custom shapes (\`Feature_DorsalFin\`, \`Feature_PectoralFinLeft\`, \`Tail_CaudalFin\`).

Focus on clear structure, descriptive naming, and correct positioning. Generate ONLY the \`createCharacter(THREE)\` function.`;

        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Create a character based on this description: ${userPrompt}` }
            ]
        });

        const codeResponse = completion.content;

        // Extract just the function from the response, being more lenient with surrounding text
        const functionMatch = codeResponse.match(/function createCharacter\s*\(\s*THREE\s*\)\s*\{[\s\S]*return\s+group\s*;\s*\}\s*/im);

        if (!functionMatch) {
            console.error("Raw LLM Response:", codeResponse); // Log the raw response for debugging
            throw new Error("Could not find a valid 'function createCharacter(THREE) { ... return group; }' block in the generated code. Ensure the function signature and return statement are correct.");
        }

        // Further validation: Check for potentially unsafe code patterns (basic check)
        const potentiallyUnsafePatterns = /\b(eval|fetch|document|window\.|localStorage|sessionStorage|XMLHttpRequest)\b/i;
        if (potentiallyUnsafePatterns.test(functionMatch[0])) {
             console.warn("Potentially unsafe code detected in generated function:", functionMatch[0]);
            // Optionally throw an error or sanitize further
            // throw new Error("Generated code contains potentially unsafe patterns.");
        }


        return functionMatch[0];
    } catch (error) {
        console.error("Error generating character code:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}


// Function to evaluate the generated code safely and create the character
function createCustomCharacter(THREE, generatedCode) {
    try {
        // Create a safe function from the generated code
        // Ensure 'THREE' is correctly passed and the function is returned and executed
        const createCharacterFn = new Function('THREE', `
            ${generatedCode}
            // Ensure the function exists before calling
            if (typeof createCharacter !== 'function') {
                throw new Error('Generated code does not define createCharacter function correctly.');
            }
            return createCharacter(THREE);
        `);

        // Execute the function with THREE as parameter
        const character = createCharacterFn(THREE);

        // Validate the return type
        if (!(character instanceof THREE.Group)) {
             console.error("Generated function did not return a THREE.Group:", character);
            throw new Error("Generated function did not return a THREE.Group instance.");
        }

        // Ensure all mesh parts have names, assigning if necessary
        let unnamedCount = 0;
        character.traverse((child) => {
            if (child.isMesh) {
                if (!child.name || typeof child.name !== 'string' || child.name.trim() === '') {
                    // Attempt to generate a path-based name or use UUID as fallback
                    let pathName = `UnnamedMesh_${unnamedCount++}`;
                    try {
                        const path = getObjectPath(child, character); // Use helper to get path
                        if (path) pathName = path;
                    } catch (e) {
                        console.warn("Could not generate path name for unnamed mesh", e);
                    }
                     console.warn(`Mesh found without a valid name. Assigning temporary name: ${pathName}`, child);
                    child.name = pathName;
                }
                 // Ensure userData exists
                 if (!child.userData) child.userData = {};
            } else if (child.isGroup) {
                 // Ensure groups also have names (optional but good practice)
                 if (!child.name || typeof child.name !== 'string' || child.name.trim() === '') {
                     // Assign a generic group name if missing
                     // child.name = `Group_${child.uuid.substring(0, 6)}`;
                 }
                 // Ensure userData exists
                 if (!child.userData) child.userData = {};
            }
        });

        // --- Adjust final position AFTER naming and validation ---
        character.updateMatrixWorld(true); // Ensure world matrix is up-to-date
        const boundingBox = new THREE.Box3().setFromObject(character);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());

         // Optional: Center the model based on its bounding box if needed
         // character.position.sub(center); // Uncomment to force centering

         // Adjust vertical position so the bottom is near y=0
         const lowestPointY = boundingBox.min.y;
         character.position.y -= lowestPointY; // Move model up so bottom is at y=0 relative to its group origin
         character.position.y += 0.01; // Add a tiny offset to prevent z-fighting with ground

        console.log("Custom character created successfully:", character.name || 'Unnamed Root');
        return character;

    } catch (error) {
        console.error("Error executing or processing generated character code:", error);
        console.error("Problematic Code Snippet:", generatedCode.substring(0, 500) + "..."); // Log beginning of code
        // Return a fallback character on error
        return createFallbackCharacter(THREE);
    }
}


// Helper function to get a unique path-based name for an object within a model
function getObjectPath(object, root) {
    const path = [];
    let current = object;
    while (current && current !== root) {
        // Prioritize existing name, fallback to type, avoid adding "" for root
        const partName = current.name && typeof current.name === 'string' && current.name.trim() !== ''
                       ? current.name.trim().replace(/\//g, '-') // Replace slashes in names
                       : (current !== root ? current.type : ''); // Use type if name invalid/missing, ignore root type

        if (partName) { // Only add non-empty names/types
             path.unshift(partName);
        }
        current = current.parent;
    }
     // Add root name if it exists
     if (root.name && typeof root.name === 'string' && root.name.trim() !== '') {
        path.unshift(root.name.trim().replace(/\//g, '-'));
     }

    if (path.length === 0) return `Mesh_${object.uuid.substring(0, 6)}`; // Fallback if no valid names found in hierarchy

    return path.join('/');
}


// Helper function to determine mesh type based on position and geometry (Less reliable, prefer naming)
function determineMeshType(mesh) {
    // Prefer name if available and follows convention
    if (mesh.name && mesh.name.includes('_')) {
        return mesh.name.split('_')[0];
    }

    // Position-based detection (fallback)
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);

    if (worldPosition.y > 1.4) return "Head";
    if (worldPosition.y > 0.5) {
        if (Math.abs(worldPosition.x) > 0.2) return (worldPosition.x < 0 ? "LeftArm" : "RightArm");
        return "Body";
    }
    if (worldPosition.y > 0) {
         if (Math.abs(worldPosition.x) > 0.1) return (worldPosition.x < 0 ? "LeftLeg" : "RightLeg");
         return "Legs"; // Generic legs/base
    }
    return "Base"; // Below origin
}

// Fallback character in case the generated code fails
function createFallbackCharacter(THREE) {
    const group = new THREE.Group();
    group.name = "FallbackCharacter";

    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x6495ED, roughness: 0.7 })
    );
    head.position.y = 1.5;
    head.name = "Head_Main";
    group.add(head);

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.7, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x4169E1, roughness: 0.6 })
    );
    body.position.y = 1.0;
    body.name = "Body_Torso";
    group.add(body);

    const leftArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4169E1 })
    );
    leftArm.position.set(-0.35, 1.0, 0);
    leftArm.name = "LeftArm_Upper";
    group.add(leftArm);

    const rightArm = leftArm.clone(); // Clone for right arm
    rightArm.position.x = 0.35;
    rightArm.name = "RightArm_Upper";
    group.add(rightArm);

    const leftLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x4682B4 })
    );
    leftLeg.position.set(-0.15, 0.4, 0);
    leftLeg.name = "LeftLeg_Upper";
    group.add(leftLeg);

     const rightLeg = leftLeg.clone(); // Clone for right leg
     rightLeg.position.x = 0.15;
     rightLeg.name = "RightLeg_Upper";
     group.add(rightLeg);

     // Adjust final position
     group.updateMatrixWorld(true);
     const boundingBox = new THREE.Box3().setFromObject(group);
     const lowestPointY = boundingBox.min.y;
     group.position.y -= lowestPointY;
     group.position.y += 0.01;

    return group;
}

export { generateCharacterCode, createCustomCharacter };