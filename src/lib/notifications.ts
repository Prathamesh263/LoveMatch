export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('Notifications not supported')
        return false
    }

    if (Notification.permission === 'granted') {
        return true
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
}

export const showIncomingCallNotification = (caller: { name: string, avatar: string }, callId: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return null

    try {
        const notification = new Notification('Incoming Call', {
            body: `${caller.name} is calling...`,
            icon: caller.avatar || '/placeholder-avatar.jpg',
            badge: '/icons/icon-192x192.png', // Adjust path to actual app icon
            tag: `call-${callId}`, // Prevents duplicates
            requireInteraction: true, // Stays until dismissed
            // vibrate: [500, 300, 500, 1000], // Mobile Chrome may support this in options
            data: {
                callId: callId,
                url: window.location.origin + '/calls' // Simplistic navigation intent
            }
        })

        // Handle notification clicks
        notification.onclick = (event) => {
            event.preventDefault()
            window.focus()
            notification.close()
            // In a real PWA with Service Worker, we'd handle navigation there differently
        }

        return notification
    } catch (e) {
        console.error("Error showing notification:", e)
        return null
    }
}
