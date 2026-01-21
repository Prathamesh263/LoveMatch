'use client'

import { motion } from 'framer-motion'
import { ButtonGroup } from '@/components/ui/ButtonGroup'

interface OnboardingPreferencesProps {
    data: any
    update: (data: any) => void
}

export function OnboardingPreferences({ data, update }: OnboardingPreferencesProps) {

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Discovery Settings</h2>
                <p className="text-white/60">Who do you want to meet?</p>
            </div>

            <div className="space-y-8">
                {/* Gender Preference */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-white/80 uppercase tracking-wider">Show Me</label>
                    <ButtonGroup
                        value={data.showGender}
                        onChange={(val) => update({ ...data, showGender: val })}
                        options={[
                            { label: 'Men', value: 'male' },
                            { label: 'Women', value: 'female' },
                            { label: 'Everyone', value: 'everyone' }
                        ]}
                    />
                </div>

                {/* Age Range Inputs */}
                <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold text-white/80">
                        <span className="uppercase tracking-wider">Age Range</span>
                        <span className="text-pink-400">{data.ageRange[0]} - {data.ageRange[1]}</span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                        <div className="flex items-center space-x-4">
                            <span className="text-xs text-white/40 w-8">Min</span>
                            <input
                                type="range"
                                min="18" max="99"
                                value={data.ageRange[0]}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value)
                                    if (val <= data.ageRange[1]) {
                                        update({ ...data, ageRange: [val, data.ageRange[1]] })
                                    }
                                }}
                                className="w-full accent-pink-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-xs text-white/40 w-8">Max</span>
                            <input
                                type="range"
                                min="18" max="99"
                                value={data.ageRange[1]}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value)
                                    if (val >= data.ageRange[0]) {
                                        update({ ...data, ageRange: [data.ageRange[0], val] })
                                    }
                                }}
                                className="w-full accent-pink-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Distance Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold text-white/80">
                        <span className="uppercase tracking-wider">Maximum Distance</span>
                        <span className="text-pink-400">{data.distance} km</span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <input
                            type="range"
                            min="5" max="150"
                            value={data.distance}
                            onChange={(e) => update({ ...data, distance: parseInt(e.target.value) })}
                            className="w-full accent-pink-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-white/40 mt-2">
                            <span>5km</span>
                            <span>150km</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
