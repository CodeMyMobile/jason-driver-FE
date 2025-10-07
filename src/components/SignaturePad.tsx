import { useEffect, useRef } from 'react'

interface SignaturePadProps {
  value: string | null
  onChange: (value: string | null) => void
}

export function SignaturePad({ value, onChange }: SignaturePadProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const hasSignature = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function resizeCanvas() {
      const { offsetWidth, offsetHeight } = canvas
      const ratio = window.devicePixelRatio || 1
      canvas.width = offsetWidth * ratio
      canvas.height = offsetHeight * ratio
      const context = canvas.getContext('2d')
      if (context) {
        context.scale(ratio, ratio)
        context.lineWidth = 2
        context.lineCap = 'round'
        context.clearRect(0, 0, offsetWidth, offsetHeight)
      }
      if (value) {
        const image = new Image()
        image.src = value
        image.onload = () => {
          context?.drawImage(image, 0, 0, offsetWidth, offsetHeight)
          hasSignature.current = true
        }
      } else {
        hasSignature.current = false
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [value])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function getPoint(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    }

    function handlePointerDown(event: PointerEvent) {
      drawing.current = true
      const { x, y } = getPoint(event)
      ctx.beginPath()
      ctx.moveTo(x, y)
      event.preventDefault()
    }

    function handlePointerMove(event: PointerEvent) {
      if (!drawing.current) return
      const { x, y } = getPoint(event)
      ctx.lineTo(x, y)
      ctx.stroke()
      hasSignature.current = true
      event.preventDefault()
    }

    function handlePointerUp(event: PointerEvent) {
      if (!drawing.current) return
      handlePointerMove(event)
      drawing.current = false
      const data = canvas.toDataURL('image/png')
      onChange(hasSignature.current ? data : null)
      event.preventDefault()
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [onChange])

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasSignature.current = false
    onChange(null)
  }

  return (
    <div className="signature-wrapper">
      <canvas ref={canvasRef} className="signature-canvas" aria-label="Customer signature" />
      <button type="button" className="signature-clear" onClick={handleClear}>
        Clear Signature
      </button>
    </div>
  )
}
