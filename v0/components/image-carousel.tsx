"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Shield } from "lucide-react"

const slides = [
  {
    image: "/images/carousel-1.png",
    title: "Enterprise Security",
    description: "Bank-level encryption for your sensitive data",
  },
  {
    image: "/images/carousel-2.png",
    title: "Financial Intelligence",
    description: "Real-time insights for better decision making",
  },
  {
    image: "/images/carousel-3.png",
    title: "Team Collaboration",
    description: "Work together seamlessly across your organization",
  },
]

export function ImageCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-[#0a3d4a] via-[#0f5563] to-[#1a6b7a] overflow-hidden">
      {/* Logo and branding */}
      <div className="absolute top-8 left-8 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">ORBIT</h1>
            <p className="text-xs text-white/80">Financial Intelligence Tool</p>
          </div>
        </div>
      </div>

      {/* Carousel images */}
      <div className="relative h-full w-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={slide.image || "/placeholder.svg"}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
              quality={100}
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a3d4a]/90 via-[#0a3d4a]/40 to-transparent" />
          </div>
        ))}
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-8 left-8 right-8 z-20">
        <div className="space-y-3 max-w-md">
          <h2 className="text-3xl font-bold text-white text-balance">{slides[currentSlide].title}</h2>
          <p className="text-lg text-white/90 text-balance">{slides[currentSlide].description}</p>
        </div>

        {/* Carousel indicators */}
        <div className="flex gap-2 mt-6 justify-center">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1 rounded-full transition-all ${
                index === currentSlide ? "w-8 bg-white" : "w-4 bg-white/40"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
