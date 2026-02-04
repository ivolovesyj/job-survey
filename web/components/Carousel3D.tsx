'use client'

import { useEffect, useRef, useState } from 'react'
import { Job } from '@/types/job'
import { JobCard } from './JobCard'

interface Carousel3DProps {
  jobs: Job[]
  currentIndex: number
  onAction: (action: 'pass' | 'hold' | 'apply') => void
  onIndexChange: (index: number) => void
}

export function Carousel3D({ jobs, currentIndex, onAction, onIndexChange }: Carousel3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [cards, setCards] = useState<HTMLDivElement[]>([])

  // 3D 위치 계산
  const calculateCardPosition = (index: number, currentIdx: number) => {
    const diff = index - currentIdx
    const sphereRadius = 1200
    const angleStep = 0.25
    const angle = diff * angleStep

    const x = Math.sin(angle) * sphereRadius
    const z = (1 - Math.cos(angle)) * sphereRadius * 0.3
    const scale = Math.max(0.65, 1 - Math.abs(diff) * 0.12)

    let opacity = 1
    if (Math.abs(diff) === 1) {
      opacity = 0.7
    } else if (Math.abs(diff) > 1) {
      opacity = 0
    }

    const blur = Math.abs(diff) === 1 ? 1 : 0
    const zIndex = 100 - Math.abs(diff) * 10

    return { x, z, scale, opacity, blur, zIndex }
  }

  // 카드 위치 업데이트
  const updateCardPositions = () => {
    cards.forEach((card, index) => {
      if (!card) return
      const pos = calculateCardPosition(index, currentIndex)

      card.style.transform = `
        translate(-50%, -50%)
        translateX(${pos.x}px)
        translateZ(${-pos.z}px)
        scale(${pos.scale})
      `
      card.style.opacity = pos.opacity.toString()
      card.style.zIndex = pos.zIndex.toString()
      card.style.filter = pos.blur > 0 ? `blur(${pos.blur}px)` : 'none'
      // 현재 카드와 양옆 카드는 클릭 가능하도록
      card.style.pointerEvents = Math.abs(index - currentIndex) <= 1 ? 'auto' : 'none'
      card.style.cursor = index !== currentIndex ? 'pointer' : 'default'
    })
  }

  // currentIndex가 변경될 때마다 카드 위치 업데이트
  useEffect(() => {
    updateCardPositions()
  }, [currentIndex, cards])

  // 카드 ref 수집
  useEffect(() => {
    if (containerRef.current) {
      const cardElements = Array.from(
        containerRef.current.querySelectorAll('.carousel-card')
      ) as HTMLDivElement[]
      setCards(cardElements)
    }
  }, [jobs.length])

  // 스와이프/드래그 핸들러
  const handleDragStart = (clientX: number) => {
    setStartX(clientX)
    setIsDragging(true)
  }

  const handleDragEnd = (clientX: number) => {
    if (!isDragging) return
    setIsDragging(false)

    const diff = startX - clientX

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < jobs.length - 1) {
        onIndexChange(currentIndex + 1)
      } else if (diff < 0 && currentIndex > 0) {
        onIndexChange(currentIndex - 1)
      }
    }
  }

  // 터치 이벤트
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    handleDragEnd(e.changedTouches[0].clientX)
  }

  // 마우스 이벤트
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    handleDragEnd(e.clientX)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[70vh] md:h-[75vh]"
      style={{
        perspective: '1800px',
        perspectiveOrigin: 'center 40%',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsDragging(false)}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {jobs.map((job, index) => (
          <div
            key={job.id}
            className="carousel-card absolute top-1/2 left-1/2 w-full max-w-md"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s ease-out, filter 0.5s ease-out',
            }}
            onClick={(e) => {
              // 옆 카드 클릭 시 해당 카드로 이동
              if (index !== currentIndex && Math.abs(index - currentIndex) === 1) {
                e.stopPropagation()
                onIndexChange(index)
              }
            }}
          >
            <JobCard
              job={job}
              onPass={() => index === currentIndex && onAction('pass')}
              onHold={() => index === currentIndex && onAction('hold')}
              onApply={() => index === currentIndex && onAction('apply')}
              disabled={index !== currentIndex}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
