import { renderLLMCharacter } from './llmCharacterRenderer.js';

// Takes a screenshot of the current 3D model and generates a matching image using AI
export async function generateLLMImage(modelDescription, llmData) {
    try {
        // 1. Capture the current 3D scene to create a reference image
        const modelScreenshot = await capture3DModelScreenshot();
        
        // 2. Generate a combined description based on the model and user's description
        const enhancedDescription = await generateEnhancedDescription(modelDescription, modelScreenshot);
        
        // 3. Generate the final image based on the enhanced description
        const finalImage = await generateAIImage(enhancedDescription);
        
        // 4. Return the resulting image URL for storage
        return finalImage;
    } catch (error) {
        console.error("Error generating LLM image:", error);
        return null;
    }
}

// Capture a screenshot of the current 3D model
async function capture3DModelScreenshot() {
    try {
        // Get current renderer from the global scope
        const renderer = window.humanoidRenderer;
        const scene = window.currentHumanoidScene;
        const camera = window.humanoidCamera;
        
        if (!renderer || !scene || !camera) {
            throw new Error("3D scene not available");
        }
        
        // Ensure scene is rendered
        renderer.render(scene, camera);
        
        // Convert the canvas to a data URL
        const dataUrl = renderer.domElement.toDataURL('image/png');
        return dataUrl;
    } catch (error) {
        console.error("Error capturing 3D model screenshot:", error);
        throw error;
    }
}

// Generate an enhanced description based on the user's description and the 3D model
async function generateEnhancedDescription(userDescription, modelScreenshot) {
    try {
        // Use AI to generate a rich description based on both inputs
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert at generating detailed character descriptions based on 3D models and text descriptions.
                    Create a vivid, detailed description of the character shown in the image, incorporating elements from the provided text description.
                    Focus on their physical appearance, personality traits suggested by their look, and unique features.
                    The description should be suitable for generating a character portrait later.
                    Your response should be about 100-150 words and extremely detailed.`
                },
                {
                    role: "user",
                    content: [
                        { 
                            type: "text",
                            text: `Here is a user's description of their character: "${userDescription}". 
                            Analyze both this description and the 3D model image, then create a comprehensive character description.` 
                        },
                        {
                            type: "image_url",
                            image_url: { url: modelScreenshot }
                        }
                    ]
                }
            ]
        });
        
        return completion.content;
    } catch (error) {
        console.error("Error generating enhanced description:", error);
        throw error;
    }
}

// Generate the final image using AI image generation
async function generateAIImage(enhancedDescription) {
    try {
        // Call AI image generation with the enhanced description
        const result = await websim.imageGen({
            prompt: `Portrait of a character: ${enhancedDescription}. Detailed illustration, vibrant colors, professional quality, digital art style, front-facing portrait with detailed background elements reflecting the character's nature.`,
            aspect_ratio: "1:1",
        });
        
        return result.url;
    } catch (error) {
        console.error("Error generating AI image:", error);
        throw error;
    }
}