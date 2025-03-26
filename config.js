// --- Add character archetypes ---
export const characterArchetypes = [
    { name: 'Mage', emoji: '🧙‍♂️' },
    { name: 'Robot', emoji: '🤖' },
    { name: 'Chef', emoji: '🧑‍🍳' },
    { name: 'Doctor', emoji: '👨‍⚕️' },
    { name: 'Detective', emoji: '🕵️‍♂️' },
    { name: 'Ghost', emoji: '👻' },
    { name: 'Genie', emoji: '🧞' },
    { name: 'Dragon', emoji: '🐉' },
    { name: 'Space Marine', emoji: '🔫' }, // Note: Emoji might vary across platforms
    { name: 'King/Queen', emoji: '👑' },
    { name: 'Trickster', emoji: '🎭' },
    { name: 'Alien', emoji: '👽' },
    { name: 'Cyborg', emoji: '🦾' },
    { name: 'Police', emoji: '👮' }, // Shortened name
    { name: 'Snake', emoji: '🐍' },
    { name: 'Cat', emoji: '🐱' },
    { name: 'Bear', emoji: '🐻' },
    { name: 'Werewolf', emoji: '🐺' },
    { name: 'Skeleton', emoji: '💀' },
    { name: 'Paladin', emoji: '🛡️' },
    { name: 'Archer', emoji: '🏹' },
    { name: 'Demon', emoji: '👹' }
];

export const config = {
    // Loading screen settings
    loadingTime: Math.floor(Math.random() * (120000 - 30000 + 1)) + 30000, // Random time between 30s and 2min
    loadingTips: [
        "LLMs need regular prompting to stay happy.",
        "Don't forget to fine-tune your LLMs for better performance.",
        "Hallucinations are a feature, not a bug!",
        "Your LLM's token limit is directly related to their intelligence.",
        "Need more money? Try 'rosebud' in the chat prompt!",
        "Low on GPU? Try reducing your context window.",
        "Different models have different personalities.",
        "Overtraining can lead to model burnout."
    ],
    
    // Game settings
    startingResources: {
        money: 1000,
        energy: 500
    },
    
    // City scene settings
    citySize: 2000, // Increased from 500 for larger world
    groundColor: 0x7cfc00,

    // Music player settings
    music: {
        defaultVolume: 2, // 0-4 (OFF, 25%, 50%, 75%, 100%)
        fadeInDuration: 5000,
        fadeOutDuration: 3000
    }
};