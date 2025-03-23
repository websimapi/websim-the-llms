import * as THREE from 'three';

// Function to call AI and generate Three.js code for a character
async function generateCharacterCode(userPrompt) {
    try {
        const prompt = `Create Three.js code for a character model based on this description: ${userPrompt}

The code should be a valid JavaScript function that follows this format:
function createCharacter(THREE) {
    const group = new THREE.Group();
    
    // Your generated code goes here
    // Add objects to the group
    
    return group;
}

Important requirements:
1. The character should be centered at origin (0,0,0)
2. Keep the character proportional to a human (about 1.7 units tall)
3. Use only Three.js built-in geometries and materials
4. Return a THREE.Group containing all objects
5. Make sure the code is safe (no fetch, eval, etc.)
6. Be creative with colors and shapes to match the description`;

        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: "You are an expert Three.js developer who creates visually appealing 3D character models." },
                { role: "user", content: prompt }
            ]
        });

        const codeResponse = completion.content;
        
        // Extract just the function from the response
        const functionMatch = codeResponse.match(/function createCharacter\(THREE\) \{[\s\S]*return group;[\s\S]*\}/);
        if (!functionMatch) {
            throw new Error("Could not find valid function in generated code");
        }
        
        return functionMatch[0];
    } catch (error) {
        console.error("Error generating character code:", error);
        throw error;
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
        return createCharacterFn(THREE);
    } catch (error) {
        console.error("Error creating custom character:", error);
        return createFallbackCharacter(THREE);
    }
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
    group.add(head);
    
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.7, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x4169E1 })
    );
    body.position.y = 1.0;
    group.add(body);
    
    const leftArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4169E1 })
    );
    leftArm.position.set(-0.3, 1.0, 0);
    leftArm.rotation.z = Math.PI / 2;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4169E1 })
    );
    rightArm.position.set(0.3, 1.0, 0);
    rightArm.rotation.z = -Math.PI / 2;
    group.add(rightArm);
    
    const legs = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.15, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x4682B4 })
    );
    legs.position.y = 0.4;
    group.add(legs);
    
    return group;
}

export { generateCharacterCode, createCustomCharacter };