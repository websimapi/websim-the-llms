async function playTrack(type, customSrc = '') {
    targetTrackType = type;

    if (!bgAudio) initializeAudio(); // Ensure audio is initialized

    if (type === currentTrackType && !bgAudio.paused && bgAudio.volume > 0) {
        console.log(`Track type ${type} is already playing.`);
        // Ensure it's fully faded in if needed
        fadeInMusic(config.music.fadeInDuration / 2 || 1000); // Quick fade in if not already at target
        return;
    }
    
    // If the target is the same but the audio is paused or silent, just fade in
    if (type === currentTrackType && (bgAudio.paused || bgAudio.volume === 0)) {
        console.log(`Track type ${type} was selected but paused/silent. Fading in.`);
        fadeInMusic(config.music.fadeInDuration || 5000); // Use longer fade-in from config
        return;
    }

    const newTrackSrc = type === 'creation' ? CREATION_MUSIC_TRACK :
                       type === 'city' ? CITY_MUSIC_TRACK :
                       type === 'custom' ? customSrc : CITY_MUSIC_TRACK;

    if (!newTrackSrc) {
        console.error("Invalid track type or missing custom source.");
        return;
    }

    console.log(`Request to play track type: ${type}. Current: ${currentTrackType}`);

    // Fade out current track only if it's playing and has volume
    if (!bgAudio.paused && bgAudio.volume > 0.01) {
        await fadeOutMusic(config.music.fadeOutDuration || 3000); // Use longer fade-out from config
    } else {
        // Ensure volume is 0 if paused or already silent
        bgAudio.volume = 0;
        updateVolumeUI();
    }

    // Check if target changed during fade-out
    if (targetTrackType !== type) {
         console.log(`Target track changed during fade-out. Aborting switch to ${type}.`);
         // Potentially start fading in the NEW target track here if needed
         // For now, just aborting.
         return;
     }

    changeTrack(newTrackSrc, type); // This sets bgAudio.volume based on musicVolume

    // Fade in the new track
    fadeInMusic(config.music.fadeInDuration || 5000); // Use longer fade-in from config
}