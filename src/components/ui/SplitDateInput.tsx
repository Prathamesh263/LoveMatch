'use client'

import { useEffect, useState } from 'react'

interface SplitDateInputProps {
    onChange: (date: string) => void
    required?: boolean
}

export function SplitDateInput({ onChange, required }: SplitDateInputProps) {
    const [day, setDay] = useState('')
    const [month, setMonth] = useState('')
    const [year, setYear] = useState('')

    useEffect(() => {
        if (day && month && year) {
            // Format as YYYY-MM-DD for standard date input compatibility
            onChange(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
        } else {
            onChange('')
        }
    }, [day, month, year, onChange])

    return (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white/90 ml-1">Birthday</label>
            <div className="flex gap-2 text-white">
                <input
                    type="text"
                    placeholder="MM"
                    maxLength={2}
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-20 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-red-500/50 transition-colors"
                />
                <input
                    type="text"
                    placeholder="DD"
                    maxLength={2}
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-20 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-red-500/50 transition-colors"
                />
                <input
                    type="text"
                    placeholder="YYYY"
                    maxLength={4}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-28 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-red-500/50 transition-colors"
                />
                {/* Hidden input to enforce html5 validation if needed, though mostly handled by state logic */}
                <input tabIndex={-1} className="w-0 h-0 opacity-0" required={required} value={year && month && day ? 'valid' : ''} onChange={() => { }} />
            </div>
        </div>
    )
}
