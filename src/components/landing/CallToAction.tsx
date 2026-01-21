'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Heart } from 'lucide-react'

export default function CallToAction() {
    return (
        <section className="relative py-32 bg-gradient-to-br from-pink-50 via-white to-pink-50 dark:from-gray-900 dark:to-black">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-64 h-64 bg-pink-300 rounded-full blur-[100px] opacity-30 animate-pulse" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400 rounded-full blur-[100px] opacity-30 animate-float" />
            </div>

            <div className="container mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                >
                    <div className="flex justify-center mb-6">
                        <div className="bg-pink-100 p-4 rounded-full">
                            <Heart className="w-12 h-12 text-pink-600 fill-pink-600" />
                        </div>
                    </div>

                    <h2 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600 mb-6 font-serif">
                        Find Your Love Today
                    </h2>
                    <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
                        Join thousands of happy couples who found their perfect match. Your story begins with a single swipe.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link href="/auth/sign-up" className="group relative px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-full text-xl font-bold hover:shadow-lg hover:shadow-pink-500/30 transition-all hover:-translate-y-1">
                            <span className="flex items-center gap-2">
                                Sign Up Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Link>
                        <Link href="/auth/sign-in" className="px-8 py-4 border-2 border-pink-500 text-pink-600 dark:text-pink-400 rounded-full text-xl font-bold hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-colors">
                            Sign In
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
