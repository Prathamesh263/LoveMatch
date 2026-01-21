'use client'

import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'

interface PhotoItem {
    url: string
    file?: File
}

interface OnboardingPhotosProps {
    data: { photos: PhotoItem[] }
    update: (data: any) => void
}

export function OnboardingPhotos({ data, update }: OnboardingPhotosProps) {
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            const url = URL.createObjectURL(file)

            // Create new array based on current photos
            // We need to ensure the array has enough slots up to 'index'
            const currentPhotos = [...(data.photos || [])]

            // Fill gaps if any (though UI prevents this mostly)
            while (currentPhotos.length < index) {
                currentPhotos.push({ url: '' }) // Placeholder or handle differently
            }

            const newPhotoItem: PhotoItem = { url, file }

            if (index < currentPhotos.length) {
                // Revoke old URL if it was a blob
                if (currentPhotos[index].file) {
                    URL.revokeObjectURL(currentPhotos[index].url)
                }
                currentPhotos[index] = newPhotoItem
            } else {
                currentPhotos.push(newPhotoItem)
            }

            update({ ...data, photos: currentPhotos })
        }
    }

    const removePhoto = (index: number) => {
        const photoToRemove = data.photos[index]
        if (photoToRemove.file) {
            URL.revokeObjectURL(photoToRemove.url)
        }

        const newPhotos = data.photos.filter((_, i) => i !== index)
        update({ ...data, photos: newPhotos })
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
        >
            <h2 className="text-3xl font-bold text-white mb-2">Add Your Best Photos</h2>
            <p className="text-white/60 mb-8">Upload at least 3 photos to start. Pick ones that show the real you.</p>

            <div className="grid grid-cols-3 grid-rows-2 gap-3 aspect-square max-w-sm mx-auto">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                    const photo = data.photos?.[index]

                    return (
                        <div key={index} className={`relative rounded-xl border-2 border-dashed ${index === 0 ? 'col-span-2 row-span-2' : ''} ${photo ? 'border-transparent' : 'border-white/10 bg-white/5'} overflow-hidden hover:border-pink-500/50 transition-colors`}>
                            {photo ? (
                                <div className="relative w-full h-full group">
                                    <img src={photo.url} alt="User upload" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removePhoto(index)}
                                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group">
                                    <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 bg-pink-500 rounded-full p-0.5 md:p-1 border-2 md:border-4 border-[#1a1a1a]">
                                        <Plus size={14} className="text-white" />
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, index)} />
                                </label>
                            )}
                        </div>
                    )
                })}
            </div>
        </motion.div>
    )
}
