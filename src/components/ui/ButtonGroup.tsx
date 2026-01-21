'use client'

import { cn } from "@/lib/utils"

interface ButtonGroupProps {
    options: { label: string; value: string }[]
    value: string
    onChange: (value: string) => void
    label?: string
}

export function ButtonGroup({ options, value, onChange, label }: ButtonGroupProps) {
    return (
        <div className="space-y-1.5">
            {label && <label className="text-sm font-semibold text-white/90 ml-1">{label}</label>}
            <div className="flex gap-2">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-full border-2 text-sm font-bold transition-all duration-200",
                            value === option.value
                                ? "border-red-500 bg-transparent text-red-500" // Selected state (referencing image: outlined with color)
                                : "border-white/10 bg-white/5 text-white/70 hover:border-white/30" // Default state
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
