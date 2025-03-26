import * as THREE from 'three';
import { characterArchetypes } from './config.js'; // Import archetypes

// Function to call AI and generate Three.js code for a character
// Modified to accept baseModelType and archetype
async function generateCharacterCode(baseModelType, archetype) {
    try {
        const archetypeEmoji = characterArchetypes.find(a => a.name === archetype)?.emoji || '';
        const description = `A 3D character model for a game. The base model type is '${baseModelType}', representing its core function (e.g., Assistant, Creator, Researcher, Companion, Humanoid). The character's specific archetype/flavor is '${archetype}' ${archetypeEmoji}. Combine these concepts creatively.`;

        // Updated prompt to be even more strict about the output format.
        const prompt = `Create Three.js code for a character model based on this description: ${description}

Respond ONLY with the raw JavaScript function code, starting EXACTLY with 'function createCharacter(THREE) {' and ending EXACTLY with '}'. Do NOT include any introductory text, explanations, comments outside the function body, or markdown formatting like \`\`\`javascript.

The function must follow this precise structure:
function createCharacter(THREE) {
    const group = new THREE.Group();

    // --- Generated code starts here ---
    // Example: Define materials
    const primaryMaterial = new THREE.MeshStandardMaterial({ color: 0x${Math.random().toString(16).slice(2, 8)}, roughness: 0.5 });
    const secondaryMaterial = new THREE.MeshStandardMaterial({ color: 0x${Math.random().toString(16).slice(2, 8)}, metalness: 0.8 });

    // Example: Create body parts
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3), primaryMaterial);
    head.position.y = 1.5;
    head.name = "Head_Main";
    group.add(head);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), primaryMaterial);
    body.position.y = 1.0;
    body.name = "Body_Torso";
    group.add(body);

    // ... add more parts like limbs, accessories, etc., relevant to the description ...
    // --- Generated code ends here ---

    return group;
}

Important requirements:
1. Combine the '${baseModelType}' function and '${archetype}' ${archetypeEmoji} theme.
2. The character should be centered at origin (0,0,0) before being added to the group.
3. Keep the character proportional to a humanoid (roughly 1.5 to 1.8 units tall).
4. Use only Three.js built-in geometries (Box, Sphere, Cylinder, Cone, Torus, Plane, etc.) and materials (MeshStandardMaterial, MeshBasicMaterial).
5. Return a single THREE.Group containing all character objects.
6. Ensure the generated code is safe JavaScript (no fetch, eval, external scripts, etc.).
7. Be creative with colors and shapes to match the combined description.
8. Give each Mesh a descriptive name using \`object.name = "PartType_Description"\` format (e.g., "Head_Main", "LeftArm_Upper", "Feature_Wings").
9. Use standard part types: Head, Body, LeftArm, RightArm, LeftLeg, RightLeg, Feature.
10. Position parts appropriately in 3D space. Use parent-child relationships if helpful (e.g., add eyes to the head group).
11. Include at least a head and body/torso. Limbs or other features are highly encouraged based on the archetype.

Focus on visual representation reflecting the archetype within the base model's role.
Remember: ONLY output the raw JavaScript code for the 'createCharacter' function.`;

        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: "You are an expert Three.js developer creating 3D character models based on descriptions. Respond ONLY with the raw JavaScript function code, starting exactly with `function createCharacter(THREE) {` and ending exactly with `}`." },
                { role: "user", content: prompt }
            ]
        });

        let codeResponse = completion.content.trim();

        // Basic validation (more robust validation might be needed)
        if (!codeResponse.startsWith("function createCharacter(THREE) {") || !codeResponse.endsWith("}")) {
             console.error("Raw AI response:", codeResponse); // Log the raw response for debugging
             throw new Error("Generated code does not match the required function format.");
        }

        return codeResponse;
    } catch (error) {
        console.error("Error generating character code:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
}

// Function to evaluate the generated code safely and create the character
function createCustomCharacter(THREE, generatedCode) {
    try {
        // Create a safe function from the generated code
        const createCharacterFn = new Function('THREE', `
            ${generatedCode}
            return createCharacter(THREE);
        `);

        // Execute the function with THREE as parameter
        const character = createCharacterFn(THREE);

        // Add name labels to each part
        let partIndex = 0;
        character.traverse(child => {
            if (child.isMesh) {
                // Name parts if they don't have names already
                if (!child.name || child.name === '') {
                    const partType = determineMeshType(child);
                    child.name = `${partType}_${partIndex}`;
                    partIndex++;
                }
            }
        });

        return character;
    } catch (error) {
        console.error("Error creating custom character:", error);
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