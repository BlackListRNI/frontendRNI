// Sound effects utility
window.Sound = {
    // Preload sounds
    sounds: {
        success: new Audio('assets/postsound.mp3')
    },

    // Play success sound
    playSuccess() {
        try {
            const sound = this.sounds.success.cloneNode();
            sound.volume = 0.5; // 50% volume
            sound.play().catch(err => {
                console.log('Sound play prevented:', err);
            });
        } catch (error) {
            console.log('Sound error:', error);
        }
    },

    // Play with custom volume
    play(soundName, volume = 0.5) {
        try {
            if (this.sounds[soundName]) {
                const sound = this.sounds[soundName].cloneNode();
                sound.volume = volume;
                sound.play().catch(err => {
                    console.log('Sound play prevented:', err);
                });
            }
        } catch (error) {
            console.log('Sound error:', error);
        }
    },

    // Preload all sounds
    preload() {
        Object.values(this.sounds).forEach(sound => {
            sound.load();
        });
    }
};

// Preload sounds when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.Sound.preload();
});
