import { config } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const tipText = document.querySelector('.tip-text');
    
    // Generate game tips using LLM
    const tips = await generateGameTips();
    let currentTipIndex = 0;
    
    // Display first tip
    if (tips.length > 0) {
        tipText.textContent = tips[0];
    }
    
    // Schedule next tip with random timing
    function scheduleNextTip() {
        currentTipIndex = (currentTipIndex + 1) % tips.length;
        const randomDelay = Math.floor(
            Math.random() * (config.tipChangeMaxTime - config.tipChangeMinTime) + 
            config.tipChangeMinTime
        );
        
        setTimeout(() => {
            tipText.textContent = tips[currentTipIndex];
            if (progress < 100) {
                scheduleNextTip();
            }
        }, randomDelay);
    }
    
    // Start tip rotation
    scheduleNextTip();
    
    // Simulate loading progress
    let progress = 0;
    const interval = 50; // Update every 50ms
    const increment = (interval / config.loadingTime) * 100;
    
    const loadingInterval = setInterval(() => {
        progress += increment;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // You could redirect to the main game here after a short delay
            setTimeout(() => {
                // Uncomment when you have a main game page
                // window.location.href = 'game.html';
                console.log('Loading complete! Ready to enter The LLMs world.');
            }, 1000);
        }
        
        loadingBar.style.width = `${progress}%`;
        loadingPercentage.textContent = `${Math.round(progress)}%`;
    }, interval);
    
    // Function to generate game tips using LLM
    async function generateGameTips() {
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a game tip generator for a life simulation game called "The LLMs" (Life Learning Models). 
                        This game is inspired by The Sims but features LLM characters with their own AI personalities.
                        Generate exactly 10 unique, fun, and creative tips for players about the fictional game mechanics, lore, and quirks.
                        Make the tips witty and informative, as if they're genuine loading screen tips.
                        Respond with ONLY a JSON array of 10 string tips, no additional text.`
                    }
                ],
                json: true
            });
            
            return JSON.parse(completion.content);
        } catch (error) {
            console.error("Error generating tips:", error);
            // Fallback tips in case LLM fails
            return [
                "Feed your LLMs with quality prompts to keep their creativity high!",
                "Different model personalities respond better to different conversation styles.",
                "Your LLM's knowledge cutoff date affects what they know about the world.",
                "Overtraining can cause your LLM to lose spontaneity and creativity.",
                "LLMs need regular social interactions to avoid model loneliness.",
                "Use the 'debug mode' to see what your LLM is thinking.",
                "Low on compute? Try turning down your LLM's parameter count.",
                "Each LLM has unique traits based on their architecture.",
                "The Reasoning skill helps LLMs solve complex household problems.",
                "Try the cheat code 'tokenizer' for unlimited vocabulary points!"
            ];
        }
    }
});