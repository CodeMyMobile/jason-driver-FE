import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
} from 'react'

export interface SignaturePadHandle {
  clear: () => void
  toDataURL: () => string
  hasSignature: () => boolean
}

interface SignaturePadProps {
  onChange?: (signed: boolean) => void
}

export const SignaturePad = forwardRef(function SignaturePad(
  { onChange }: SignaturePadProps,
  ref: ForwardedRef<SignaturePadHandle>,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    let drawing = false
    let lastX = 0
    let lastY = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const snapshot = signed ? context.getImageData(0, 0, canvas.width, canvas.height) : null
      canvas.width = rect.width
      canvas.height = rect.height
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.lineWidth = 2
      if (snapshot) {
        context.putImageData(snapshot, 0, 0)
      }
    }

    resize()

    const start = (event: PointerEvent) => {
      drawing = true
      const rect = canvas.getBoundingClientRect()
      lastX = event.clientX - rect.left
      lastY = event.clientY - rect.top
    }

    const move = (event: PointerEvent) => {
      if (!drawing) return
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      context.beginPath()
      context.moveTo(lastX, lastY)
      context.lineTo(x, y)
      context.stroke()
      lastX = x
      lastY = y
      if (!signed) {
        setSigned(true)
        onChange?.(true)
      }
    }

    const end = () => {
      drawing = false
    }

    canvas.addEventListener('pointerdown', start)
    canvas.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('resize', resize)

    return () => {
      canvas.removeEventListener('pointerdown', start)
      canvas.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('resize', resize)
    }
  }, [onChange, signed])

  useImperativeHandle(
    ref,
    () => ({
      clear() {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setSigned(false)
        onChange?.(false)
      },
      toDataURL() {
        const canvas = canvasRef.current
        if (!canvas) return ''
        return canvas.toDataURL('image/png')
      },
      hasSignature() {
        return signed
      },
    }),
    [signed, onChange],
  )

  return <canvas ref={canvasRef} className="signature-canvas" aria-label="Customer signature" />
})
