'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

const FRAME_COUNT = 144
const IMAGES_PATH = '/hero/ezgif-frame-'

export default function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [images, setImages] = useState<HTMLImageElement[]>([])
    const [loading, setLoading] = useState(true)

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end end'],
    })

    // Smooth scroll progress for smoother animation
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    })

    useEffect(() => {
        const loadImages = async () => {
            const loadedImages: HTMLImageElement[] = []
            const promises = []

            for (let i = 1; i <= FRAME_COUNT; i++) {
                const promise = new Promise((resolve, reject) => {
                    const img = new Image()
                    const padIndex = i.toString().padStart(3, '0')
                    img.src = `${IMAGES_PATH}${padIndex}.png`
                    img.onload = () => {
                        loadedImages[i - 1] = img
                        resolve(img)
                    }
                    img.onerror = reject
                })
                promises.push(promise)
            }

            try {
                await Promise.all(promises)
                setImages(loadedImages)
                setLoading(false)
            } catch (error) {
                console.error('Failed to load images', error)
                setLoading(false)
            }
        }

        loadImages()
    }, [])

    useEffect(() => {
        if (!canvasRef.current || images.length === 0) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Draw image covering canvas while maintaining aspect ratio
        const drawImageScaled = (img: HTMLImageElement, ctx: CanvasRenderingContext2D) => {
            const canvas = ctx.canvas;
            const hRatio = canvas.width / img.width;
            const vRatio = canvas.height / img.height;
            const ratio = Math.max(hRatio, vRatio);
            const centerShift_x = (canvas.width - img.width * ratio) / 2;
            const centerShift_y = (canvas.height - img.height * ratio) / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, img.width, img.height,
                centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
        }

        // Set canvas dimensions to match window or container
        const updateDimensions = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight

            // Initial draw
            const currentIndex = Math.floor(smoothProgress.get() * (FRAME_COUNT - 1))
            if (images[currentIndex]) {
                drawImageScaled(images[currentIndex], ctx)
            }
        }

        updateDimensions()
        window.addEventListener('resize', updateDimensions)

        const unsubscribe = smoothProgress.on('change', (latest) => {
            const index = Math.min(
                FRAME_COUNT - 1,
                Math.floor(latest * (FRAME_COUNT - 1))
            )
            const img = images[index]
            if (img) {
                requestAnimationFrame(() => drawImageScaled(img, ctx))
            }
        })

        return () => {
            window.removeEventListener('resize', updateDimensions)
            unsubscribe()
        }
    }, [images, smoothProgress])

    // Text Animations mapped to scroll
    const opacity1 = useTransform(smoothProgress, [0, 0.2, 0.3], [0, 1, 0])
    const opacity2 = useTransform(smoothProgress, [0.3, 0.45, 0.6], [0, 1, 0])
    const opacityScale = useTransform(smoothProgress, [0.6, 0.75, 0.9], [0, 1, 0])

    return (
        <div ref={containerRef} className="relative h-[800vh] bg-gradient-to-b from-zinc-900 via-red-950 to-black">
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-50">
                        <div className="text-red-600 font-serif text-2xl animate-pulse">Loading LoveMatch...</div>
                    </div>
                )}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

                {/* Overlay Gradients */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

                {/* Text Messages */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.h2
                        style={{ opacity: opacity1, y: useTransform(smoothProgress, [0, 0.2], [50, 0]) }}
                        className="text-6xl md:text-8xl font-serif text-white font-bold text-center drop-shadow-lg"
                    >
                        Where Hearts Connect
                    </motion.h2>
                    <motion.h2
                        style={{ opacity: opacity2, scale: useTransform(smoothProgress, [0.3, 0.45], [0.9, 1]) }}
                        className="absolute text-6xl md:text-8xl font-serif text-white font-bold text-center drop-shadow-lg"
                    >
                        Find Your Perfect Match
                    </motion.h2>
                    <motion.h2
                        style={{ opacity: opacityScale, scale: useTransform(smoothProgress, [0.6, 0.75], [0.5, 1.2]) }}
                        className="absolute text-7xl md:text-9xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white font-bold text-center drop-shadow-lg"
                    >
                        Love is Here
                    </motion.h2>
                </div>
            </div>
        </div>
    )
}
