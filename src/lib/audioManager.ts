export class CallAudioManager {
    private incomingRingtone: HTMLAudioElement | null = null
    private outgoingTone: HTMLAudioElement | null = null
    private endTone: HTMLAudioElement | null = null
    private currentRingtone: string
    private fadeInInterval: NodeJS.Timeout | null = null

    constructor() {
        this.currentRingtone = 'incoming-call' // Default
        if (typeof window !== 'undefined') {
            this.setupAudioElements()
        }
    }

    setupAudioElements() {
        // Incoming call ringtone (loops)
        this.incomingRingtone = new Audio(`/sounds/${this.currentRingtone}.mp3`)
        this.incomingRingtone.loop = true
        this.incomingRingtone.volume = 0.1 // Start quiet, fade in

        // Outgoing call tone
        this.outgoingTone = new Audio('/sounds/outgoing-call.mp3')
        this.outgoingTone.loop = true
        this.outgoingTone.volume = 0.7

        // Call ended tone
        this.endTone = new Audio('/sounds/call-ended.mp3')
        this.endTone.volume = 0.5
    }

    playIncomingRingtone() {
        if (!this.incomingRingtone) this.setupAudioElements()
        if (!this.incomingRingtone) return

        // Reset volume and time
        this.incomingRingtone.volume = 0.1
        this.incomingRingtone.currentTime = 0

        // Play ensure promise handling
        const playPromise = this.incomingRingtone.play()
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("Audio play failed:", error)
            })
        }

        // Clear any existing interval
        if (this.fadeInInterval) clearInterval(this.fadeInInterval)

        this.fadeInInterval = setInterval(() => {
            if (this.incomingRingtone && this.incomingRingtone.volume < 0.9) {
                // Floating point arithmetic safety
                this.incomingRingtone.volume = Math.min(1.0, this.incomingRingtone.volume + 0.1)
            } else {
                if (this.fadeInInterval) clearInterval(this.fadeInInterval)
            }
        }, 200) // Increase volume every 200ms
    }

    playOutgoingTone() {
        if (!this.outgoingTone) this.setupAudioElements()
        if (!this.outgoingTone) return

        this.outgoingTone.currentTime = 0
        this.outgoingTone.play().catch(e => console.error("Outgoing tone failed:", e))
    }

    stopAllRingtones() {
        if (this.fadeInInterval) {
            clearInterval(this.fadeInInterval)
            this.fadeInInterval = null
        }

        if (this.incomingRingtone) {
            this.incomingRingtone.pause()
            this.incomingRingtone.currentTime = 0
        }
        if (this.outgoingTone) {
            this.outgoingTone.pause()
            this.outgoingTone.currentTime = 0
        }
    }

    playCallEnded() {
        if (!this.endTone) this.setupAudioElements()
        if (!this.endTone) return

        this.endTone.play().catch(e => console.error("End tone failed:", e))
    }

    playCallConnected() {
        const connectedSound = new Audio('/sounds/call-connected.mp3')
        connectedSound.play().catch(e => console.error("Connected tone failed:", e))
    }

    setRingtone(ringtoneName: string) {
        this.currentRingtone = ringtoneName
        if (this.incomingRingtone) {
            let path = ''
            // List of known custom ringtones in /public/ringtone/
            const customRingtones = ['lulu_lulu_ringtone', 'tadow', 'uchal_marathi_funny']

            if (ringtoneName === 'incoming-call') {
                path = `/sounds/incoming-call.mp3`
            } else if (customRingtones.includes(ringtoneName)) {
                path = `/ringtone/${ringtoneName}.mp3`
            } else {
                path = `/sounds/ringtones/${ringtoneName}.mp3`
            }

            this.incomingRingtone.src = path
            this.incomingRingtone.load()
        }
    }
}

// Export singleton instance
export const audioManager = new CallAudioManager()
