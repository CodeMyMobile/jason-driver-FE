import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void
}

export function SignaturePad({ onChange }: SignaturePadProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(ratio, ratio)
    context.lineWidth = 2
    context.lineJoin = 'round'
    context.lineCap = 'round'
    context.strokeStyle = '#1f2937'
    context.clearRect(0, 0, rect.width, rect.height)
    setIsEmpty(true)
    onChange(null)
  }, [onChange])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    drawing.current = true
    const rect = canvas.getBoundingClientRect()
    context.beginPath()
    context.moveTo(event.clientX - rect.left, event.clientY - rect.top)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const rect = canvas.getBoundingClientRect()
    context.lineTo(event.clientX - rect.left, event.clientY - rect.top)
    context.stroke()
  }

  const commitStroke = () => {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.closePath()
    setIsEmpty(false)
    onChange(canvas.toDataURL('image/png'))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId)
    commitStroke()
  }

  const handlePointerLeave = () => {
    commitStroke()
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    onChange(null)
  }

  return (
    <div className="signature-pad">
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
      <div className="signature-actions">
        <button type="button" onClick={handleClear} className="signature-clear" disabled={isEmpty}>
          Clear Signature
        </button>
      </div>
    </div>
  )
}
