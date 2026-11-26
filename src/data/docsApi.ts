// File helpers for the Operations document modules (WLA statements, TDS letters, EOD counter slips / vault proofs).
// The shared <FileDrop> only reports { name, size }; `useRawFile` captures the real File object from the wrapped
// input / drop event so it can be uploaded to POST /files in API mode.
import { useCallback, useRef, type DragEvent, type FormEvent } from 'react'
import { api, uploadFile, type UploadMeta } from '@/lib/api'
import { apiCall } from '@/data/opsApi'

/** Spread `capture` on a wrapper element around <FileDrop>; `file()` returns the last picked / dropped File. */
export function useRawFile() {
  const ref = useRef<File | null>(null)
  const onChangeCapture = useCallback((e: FormEvent<HTMLElement>) => {
    const t = e.target as HTMLInputElement
    if (t?.type === 'file' && t.files?.[0]) ref.current = t.files[0]
  }, [])
  const onDropCapture = useCallback((e: DragEvent<HTMLElement>) => {
    const f = e.dataTransfer?.files?.[0]
    if (f) ref.current = f
  }, [])
  return { capture: { onChangeCapture, onDropCapture }, file: () => ref.current, clear: () => (ref.current = null) }
}

/** Upload a document to POST /files (toast on failure) → fileId. Backend accepts PDF / JPG / PNG only. */
export async function uploadDoc(file: File | null | undefined, meta: UploadMeta = {}): Promise<string> {
  if (!file) throw new Error('Choose the file again — the selected file is no longer available for upload.')
  const r = await apiCall(() => uploadFile(file, meta), 'Upload failed')
  return r.fileId
}

/** Download a protected file endpoint (bearer auth) and hand it to the browser. */
export async function downloadAuthed(path: string, fallbackName: string) {
  const res = await apiCall(() => api<Response>(path, { raw: true }))
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: { message?: string } })?.error?.message ?? `Download failed (${res.status})`)
  }
  const cd = res.headers.get('Content-Disposition') ?? ''
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? fallbackName
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export type OcrPreview = { provider: string; fields: Record<string, string>; confidence: number; requiresConfirmation: true; notes: string[]; fileId: string; fileName: string }
