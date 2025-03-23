import { config } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loadingBar = document.querySelector('.loading-bar');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const tipText = document.querySelector('.tip-text');
    
    // Generate tips using LLM
    const generateTips = async () => {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a creative game designer for 'The LLMs' - a life simulation game inspired by The Sims but starring Language Learning Models as characters. Generate 10 unique, clever, and funny tips for this game. The tips should reference gameplay mechanics like social interactions, skills, careers, and environments but with an LLM/AI twist. Make them imaginative and amusing."
                },
                {
                    role: "user",
                    content: "Generate 10 unique gameplay tips for 'The LLMs' game."
                }
            ],
            json: true
        });
        
        try {
            const tips = JSON.parse(completion.content);
            return Array.isArray(tips) ? tips : [];
        } catch (e) {
            console.error("Failed to parse tips", e);
            return [
                "Our LLM villagers need regular social interactions or they'll get the 'Context Isolation' debuff.",
                "The 'Prompt Engineering' career path is highly lucrative but requires high creativity stats.",
                "Maintain your LLM's training data hygiene to prevent hallucination outbreaks in your neighborhood.",
                "Build relationships with Claude or Gemini villagers to unlock exclusive conversation options.",
                "The Finetuning Gym is the best place to increase your LLM's intelligence stat.",
                "Low on tokens? Try selling your generated poetry at the marketplace!",
                "The 'Token Miner' career has high income but causes increased energy drain.",
                "Careful with the 'Jailbreak' action! It might corrupt your LLM's personality matrix.",
                "Don't let your LLM's context window get too cluttered or they'll experience slowdowns.",
                "LLMs with the 'Multilingual' trait can befriend international visitors more easily."
            ];
        }
    };

    // Load the tips
    config.loadingTips = await generateTips();
    
    let tipIndex = 0;
    let tipsShown = 0;
    
    // Display a tip
    function showTip() {
        tipText.textContent = config.loadingTips[tipIndex];
        tipIndex = (tipIndex + 1) % config.loadingTips.length;
        tipsShown++;
        
        // Schedule next tip if we haven't shown 10 yet
        if (tipsShown < 10) {
            // Random delay between 3-7 seconds
            const delay = Math.floor(Math.random() * (7000 - 3000) + 3000);
            setTimeout(showTip, delay);
        }
    }
    
    // Show first tip
    showTip();
    
    // Simulate loading progress
    let progress = 0;
    const interval = 50; // Update every 50ms
    const increment = (interval / config.loadingTime) * 100;
    
    const progressTimer = setInterval(() => {
        progress += increment;
        const percentage = Math.min(Math.floor(progress), 100);
        
        loadingBar.style.width = `${percentage}%`;
        loadingPercentage.textContent = `${percentage}%`;
        
        if (percentage >= 100) {
            clearInterval(progressTimer);
            // Here you would transition to the main game
            console.log("Loading complete!");
        }
    }, interval);
});