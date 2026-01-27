export class VibrationManager {
    private vibrationInterval: NodeJS.Timeout | null = null

    // Check if vibration is supported
    isSupported(): boolean {
        return typeof navigator !== 'undefined' && 'vibrate' in navigator
    }

    // Incoming call pattern (repeating)
    vibrateIncoming() {
        if (!this.isSupported()) return

        // Pattern: vibrate 500ms, pause 300ms, vibrate 500ms, pause 1000ms, repeat
        const pattern = [500, 300, 500, 1000]
        navigator.vibrate(pattern)

        // Keep vibrating until stopped
        // Clear previous if any
        this.stopVibration()

        this.vibrationInterval = setInterval(() => {
            navigator.vibrate(pattern)
        }, 2300) // Sum of pattern timings
    }

    // Single vibration for call answered/ended
    vibrateSingle() {
        if (!this.isSupported()) return
        navigator.vibrate(200)
    }

    // Double vibration for important events
    vibrateDouble() {
        if (!this.isSupported()) return
        navigator.vibrate([200, 100, 200])
    }

    // Stop all vibrations
    stopVibration() {
        if (!this.isSupported()) return

        if (this.vibrationInterval) {
            clearInterval(this.vibrationInterval)
            this.vibrationInterval = null
        }
        navigator.vibrate(0) // Stop vibrating
    }
}

export const vibrationManager = new VibrationManager()
