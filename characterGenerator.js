import * as THREE from 'three';

// Function to call AI and generate Three.js code for a character
async function generateCharacterCode(userPrompt) {
    try {
        // --- Step 1: Initial Generation ---
        const initialPrompt = `
You are an expert Three.js developer creating 3D character models based on user descriptions.
Generate the Three.js code for a character model based on this description: "${userPrompt}". Make it creative and give it a slightly unique flair.

The code must be a valid JavaScript function following this EXACT format:
\`\`\`javascript
function createCharacter(THREE) {
    const group = new THREE.Group();

    // --- Generated code START ---
    // Example:
    // const headMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    // const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    // const head = new THREE.Mesh(headGeo, headMaterial);
    // head.position.y = 1.8;
    // head.name = "Head_Main";
    // group.add(head);
    // --- Generated code END ---

    return group;
}
\`\`\`

**Important Requirements:**
1.  **Function Format:** Wrap ALL code within the \`function createCharacter(THREE) { ... return group; }\` structure. Do NOT include any text outside this function.
2.  **Centering:** The character MUST be centered around the origin (0,0,0) before returning the group.
3.  **Size:** Keep the character roughly proportional to a human (around 1.7 units tall). Adjust parts accordingly.
4.  **Valid Code:** Use only Three.js (v0.157.0) built-in geometries (e.g., BoxGeometry, SphereGeometry, CylinderGeometry, ExtrudeGeometry, Shape) and materials (e.g., MeshStandardMaterial, MeshBasicMaterial). NO external libraries or complex logic.
5.  **Return Value:** Return ONLY the final \`THREE.Group\` instance containing all character parts.
6.  **Naming Convention:** Give EACH \`THREE.Mesh\` a descriptive \`name\` property following the format "PartType_Description" (e.g., "Head_Main", "Body_Torso", "LeftArm_Upper", "RightLeg_Lower", "Feature_Antenna"). This is CRUCIAL.
    *   **PartType Examples:** Head, Body, LeftArm, RightArm, LeftLeg, RightLeg, Feature, Accessory.
    *   **Description Examples:** Main, Eye, Mouth, Torso, Upper, Lower, Hand, Foot, Antenna, Wing, Tail.
7.  **Hierarchy:** Use parent-child relationships logically (e.g., add eyes to the head group, add arms to the torso or a shoulder joint).
8.  **Positioning:** Position parts relative to each other realistically in 3D space.
9.  **Completeness:** Include at least a head, body/torso, and some form of limbs/appendages appropriate to the description.
10. **Safety:** NO \`fetch\`, \`eval\`, \`document\`, \`window\`, or other browser/API calls. ONLY Three.js object creation and manipulation.
11. **Color/Style:** Be creative with colors and shapes to match the description. Use \`MeshStandardMaterial\` preferably.

**### Example 1: Simple Robot**
\`\`\`javascript
function createCharacter(THREE) {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5, metalness: 0.8 });
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0.7 });
    const limbMaterial = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.6, metalness: 0.9 });
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Glowing eyes

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), headMaterial);
    head.position.y = 1.6; // Positioned above the body
    head.name = "Head_Main";
    group.add(head);
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 8), eyeMaterial);
    leftEye.position.set(-0.1, 0.05, 0.21); leftEye.name = "Head_LeftEye"; head.add(leftEye); // Added to head
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 8), eyeMaterial);
    rightEye.position.set(0.1, 0.05, 0.21); rightEye.name = "Head_RightEye"; head.add(rightEye); // Added to head

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), bodyMaterial);
    body.position.y = 1.0; // Below the head
    body.name = "Body_Torso";
    group.add(body);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6);
    const leftArm = new THREE.Mesh(armGeo, limbMaterial);
    leftArm.position.set(-0.4, 1.0, 0); leftArm.name = "LeftArm_Full"; group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, limbMaterial);
    rightArm.position.set(0.4, 1.0, 0); rightArm.name = "RightArm_Full"; group.add(rightArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8);
    const leftLeg = new THREE.Mesh(legGeo, limbMaterial);
    leftLeg.position.set(-0.2, 0.4, 0); leftLeg.name = "LeftLeg_Full"; group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, limbMaterial);
    rightLeg.position.set(0.2, 0.4, 0); rightLeg.name = "RightLeg_Full"; group.add(rightLeg);

    // Adjust overall position if needed to center at origin before returning
    // (Example: Calculate bounding box and offset)

    return group;
}
\`\`\`

**### Example 2: Blocky Cat**
\`\`\`javascript
function createCharacter(THREE) {
    const group = new THREE.Group();
    const furMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // Brown
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x00FF00, roughness: 0.2 }); // Green eyes

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.5), furMaterial);
    body.position.y = 0.4; body.name = "Body_Torso"; group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), furMaterial);
    head.position.set(0.5, 0.6, 0); head.name = "Head_Main"; group.add(head); // Positioned front of body
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), eyeMaterial);
    leftEye.position.set(0.1, 0.1, 0.21); leftEye.name = "Head_LeftEye"; head.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), eyeMaterial);
    rightEye.position.set(-0.1, 0.1, 0.21); rightEye.name = "Head_RightEye"; head.add(rightEye);
    const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), furMaterial); // Pyramid ear
    leftEar.position.set(0.15, 0.25, 0); leftEar.rotation.z = Math.PI / 4; leftEar.name = "Head_LeftEar"; head.add(leftEar);
    const rightEar = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), furMaterial); // Pyramid ear
    rightEar.position.set(-0.15, 0.25, 0); rightEar.rotation.z = Math.PI / 4; rightEar.name = "Head_RightEar"; head.add(rightEar);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.15, 0.3, 0.15);
    const frontLeftLeg = new THREE.Mesh(legGeo, furMaterial);
    frontLeftLeg.position.set(0.3, 0.15, 0.2); frontLeftLeg.name = "LeftLeg_Front"; group.add(frontLeftLeg);
    const frontRightLeg = new THREE.Mesh(legGeo, furMaterial);
    frontRightLeg.position.set(0.3, 0.15, -0.2); frontRightLeg.name = "RightLeg_Front"; group.add(frontRightLeg);
    const backLeftLeg = new THREE.Mesh(legGeo, furMaterial);
    backLeftLeg.position.set(-0.3, 0.15, 0.2); backLeftLeg.name = "LeftLeg_Back"; group.add(backLeftLeg);
    const backRightLeg = new THREE.Mesh(legGeo, furMaterial);
    backRightLeg.position.set(-0.3, 0.15, -0.2); backRightLeg.name = "RightLeg_Back"; group.add(backRightLeg);

    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.5), furMaterial);
    tail.position.set(-0.6, 0.4, 0); tail.rotation.z = -Math.PI / 4; tail.name = "Feature_Tail"; group.add(tail);

    return group;
}
\`\`\`

**### Example 3: Floating Geometric Entity**
\`\`\`javascript
function createCharacter(THREE) {
    const group = new THREE.Group();
    const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x9400D3, roughness: 0.1, metalness: 0.5, emissive: 0x500070 }); // Dark Violet, glowing
    const shardMaterial = new THREE.MeshStandardMaterial({ color: 0x00BFFF, roughness: 0.3, metalness: 0.2 }); // Deep Sky Blue

    // Core
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), coreMaterial);
    core.position.y = 1.0; core.name = "Body_Core"; group.add(core);

    // Floating Shards
    const shardGeo = new THREE.TetrahedronGeometry(0.2, 0);
    const shard1 = new THREE.Mesh(shardGeo, shardMaterial);
    shard1.position.set(0.6, 1.3, 0.6); shard1.rotation.set(0.5, 0.5, 0.5); shard1.name = "Feature_Shard1"; group.add(shard1);
    const shard2 = new THREE.Mesh(shardGeo, shardMaterial);
    shard2.position.set(-0.7, 0.8, 0.5); shard2.rotation.set(-0.3, -0.6, 0.2); shard2.name = "Feature_Shard2"; group.add(shard2);
    const shard3 = new THREE.Mesh(shardGeo, shardMaterial);
    shard3.position.set(0.5, 0.6, -0.8); shard3.rotation.set(0.8, -0.2, -0.7); shard3.name = "Feature_Shard3"; group.add(shard3);
    const shard4 = new THREE.Mesh(shardGeo, shardMaterial);
    shard4.position.set(-0.4, 1.5, -0.6); shard4.rotation.set(-0.1, 0.9, -0.4); shard4.name = "Feature_Shard4"; group.add(shard4);

    // No legs/arms needed for this type

    return group;
}
\`\`\`

**Generate the code now based on the user prompt: "${userPrompt}"**
Provide ONLY the Javascript code within the specified function format.`;

        const initialCompletion = await websim.chat.completions.create({
            messages: [ { role: "user", content: initialPrompt } ]
        });

        let initialCode = initialCompletion.content.trim();

        // --- Step 2: Refinement ---

        // Extract only the function code reliably, removing potential markdown backticks
         const functionMatch = initialCode.match(/```javascript([\s\S]*?)```/);
         if (functionMatch && functionMatch[1]) {
             initialCode = functionMatch[1].trim();
         } else {
             // If no markdown, try finding the function directly
             const directFunctionMatch = initialCode.match(/function createCharacter\(THREE\) \{[\s\S]*return group;[\s\S]*\}/);
             if (directFunctionMatch) {
                 initialCode = directFunctionMatch[0];
             } else {
                 console.warn("Could not reliably extract initial function code. Using raw response.");
                 // Use the raw response, hoping it's just the function
             }
         }

        // Basic validation: Does it look like a function?
        if (!initialCode.startsWith('function createCharacter(THREE)') || !initialCode.endsWith('}')) {
             console.warn("Initial code generation did not follow the expected format. Skipping refinement.");
             return initialCode; // Return the potentially flawed initial code
         }


        const refinementPrompt = `
You are a 3D Model Critic and Refinement expert specializing in Three.js code.
Your task is to review the provided Three.js code, which aims to generate a character based on a user request, and refine it.

**Original User Request:** "${userPrompt}"

**Initial Generated Three.js Code:**
\`\`\`javascript
${initialCode}
\`\`\`

**Instructions:**
1.  **Analyze:** Read the code and visualize the 3D character it would create.
2.  **Critique:** Does it match the original request? Is the structure correct (head, body, limbs)? Are parts positioned logically? Are there visual glitches? Does it adhere to the naming convention ("PartType_Description") for all meshes? Is it centered at the origin? Is it roughly 1.7 units tall?
3.  **Refine:** Modify the code to improve visual appeal, fix errors, ensure adherence to the original request and ALL requirements (naming, centering, size, format). Make it look better and more accurate.
4.  **Output:** Respond ONLY with the complete, refined JavaScript function code, starting exactly with \`function createCharacter(THREE) {\` and ending exactly with \`}\`. Do NOT include explanations, comments outside the code, or markdown formatting.`;

        const refinementCompletion = await websim.chat.completions.create({
            messages: [ { role: "user", content: refinementPrompt } ]
        });

        let refinedCode = refinementCompletion.content.trim();

         // --- Final Code Extraction ---
         // Again, try to extract just the function code reliably
         const finalFunctionMatch = refinedCode.match(/```javascript([\s\S]*?)```/);
         if (finalFunctionMatch && finalFunctionMatch[1]) {
             refinedCode = finalFunctionMatch[1].trim();
         } else {
              const directFinalMatch = refinedCode.match(/function createCharacter\(THREE\) \{[\s\S]*return group;[\s\S]*\}/);
              if (directFinalMatch) {
                  refinedCode = directFinalMatch[0];
              } else {
                  console.warn("Could not reliably extract refined function code.");
                  // Fallback to initial code if refinement failed format check
                  if (!refinedCode.startsWith('function createCharacter(THREE)') || !refinedCode.endsWith('}')) {
                       console.warn("Refined code failed format check, returning initial code.");
                       return initialCode;
                  }
              }
         }

         // Final format check on the refined code
         if (!refinedCode.startsWith('function createCharacter(THREE)') || !refinedCode.endsWith('}')) {
              console.warn("Refined code still failed format check after extraction, returning initial code.");
              return initialCode;
         }

        console.log("Character generation complete (refined).");
        return refinedCode;

    } catch (error) {
        console.error("Error during character generation process:", error);
        // Fallback to trying to return potentially generated initial code if it exists
        // This assumes 'initialCode' might hold something even if refinement failed
        if (typeof initialCode !== 'undefined' && initialCode) {
            console.warn("Returning potentially incomplete initial code due to error.");
            // Basic check if initial code seems plausible
             const directFunctionMatch = initialCode.match(/function createCharacter\(THREE\) \{[\s\S]*return group;[\s\S]*\}/);
             if (directFunctionMatch) {
                 return directFunctionMatch[0];
             }
        }
        throw error; // Re-throw if no initial code or error is severe
    }
}

// Function to evaluate the generated code safely and create the character
function createCustomCharacter(THREE, generatedCode) {
    try {
        // Ensure the code string starts correctly
        if (!generatedCode.trim().startsWith('function createCharacter(THREE)')) {
            throw new Error("Generated code does not start with the expected function signature.");
        }

        // Create a safe function from the generated code
        // Added error handling within the created function
        const createCharacterFn = new Function('THREE', `
            try {
                ${generatedCode}
                // Ensure the function exists before calling
                if (typeof createCharacter !== 'function') {
                    throw new Error('createCharacter function not found in generated code.');
                }
                const characterModel = createCharacter(THREE);
                if (!(characterModel instanceof THREE.Group)) {
                     throw new Error('Generated function did not return a THREE.Group.');
                }
                // --- Post-creation checks ---
                // 1. Center the model
                const box = new THREE.Box3().setFromObject(characterModel);
                const center = box.getCenter(new THREE.Vector3());
                characterModel.position.sub(center); // Offset the group itself

                // 2. Basic Naming Check & Assignment
                let partIndex = 0;
                characterModel.traverse(child => {
                    if (child.isMesh) {
                        if (!child.name || typeof child.name !== 'string' || !child.name.includes('_')) {
                            console.warn('Assigning fallback name to mesh:', child);
                            const partType = determineMeshType(child); // Your existing helper
                            child.name = \`\${partType}_\${partIndex++}\`;
                        }
                    }
                });
                 // --- End Post-creation checks ---

                return characterModel;
            } catch(err) {
                console.error("Error executing generated character code:", err);
                // Re-throw the error to be caught by the outer try-catch
                throw new Error("Execution error in generated code: " + err.message);
            }
        `);

        // Execute the function with THREE as parameter
        const character = createCharacterFn(THREE);

        // Final validation
        if (!(character instanceof THREE.Group)) {
             throw new Error("Generated code did not return a THREE.Group.");
        }

        return character;
    } catch (error) {
        console.error("Error creating custom character:", error);
        console.error("Problematic Code:\n", generatedCode); // Log the code that failed
        return createFallbackCharacter(THREE);
    }
}

// Helper function to determine mesh type based on position and geometry
function determineMeshType(mesh) {
    // Position-based detection
    const position = mesh.position.clone();
    const parent = mesh.parent;
    
    // If parent exists, get world position
    if (parent) {
        parent.updateMatrixWorld();
        position.applyMatrix4(parent.matrixWorld);
    }
    
    // Y-position based detection
    if (position.y > 1.5) {
        return "Head";
    } else if (position.y > 0.8 && position.y < 1.5) {
        return "Body";
    } else if (position.y < 0.8 && position.y > 0) {
        // Check if it's on the side
        if (Math.abs(position.x) > 0.2) {
            return position.x < 0 ? "LeftLimb" : "RightLimb";
        }
        return "Legs";
    } else if (position.y <= 0) {
        return "Base";
    }
    
    // Geometry-based detection fallback
    if (mesh.geometry) {
        if (mesh.geometry.type.includes("Sphere")) {
            return "Head";
        } else if (mesh.geometry.type.includes("Box") || mesh.geometry.type.includes("Cylinder")) {
            return "Body";
        }
    }
    
    return "Part";
}

// Fallback character in case the generated code fails
function createFallbackCharacter(THREE) {
    const group = new THREE.Group();
    
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
    leftArm.position.set(-0.3, 1.0, 0);
    leftArm.rotation.z = Math.PI / 2;
    leftArm.name = "LeftArm_Upper";
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4169E1 })
    );
    rightArm.position.set(0.3, 1.0, 0);
    rightArm.rotation.z = -Math.PI / 2;
    rightArm.name = "RightArm_Upper";
    group.add(rightArm);
    
    const legs = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.15, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x4682B4 })
    );
    legs.position.y = 0.4;
    legs.name = "LeftLeg_Upper";
    group.add(legs);
    
    return group;
}

export { generateCharacterCode, createCustomCharacter };