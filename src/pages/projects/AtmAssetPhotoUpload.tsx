import { useState, useRef, useMemo, type ChangeEvent } from 'react'
import {
  Camera,
  UploadCloud,
  Eye,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Monitor,
  Box,
  Zap,
  BatteryCharging,
  Radio,
  HardDrive,
  Cpu,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import type { AssetPhoto } from '@/data/siteInstallation'

export interface AssetDefinition {
  key: string
  seq: number
  label: string
  subText: string
  icon: typeof Monitor
  recommendedAngles: string[]
}

export const ASSET_LIST: AssetDefinition[] = [
  {
    key: 'atm_machine_type',
    seq: 1,
    label: 'ATM Machine Type',
    subText: 'Manufacturer model badge, model tag plate, front brand styling',
    icon: Monitor,
    recommendedAngles: ['Front Brand Fascia', 'Model / Rating Tag', 'Side Enclosure'],
  },
  {
    key: 'atm_machine_status',
    seq: 2,
    label: 'ATM Machine Status',
    subText: 'Overall ATM unit, screen/keypad display, cash dispenser throat',
    icon: Monitor,
    recommendedAngles: ['Full Booth View', 'Screen & Pin-pad', 'Cash Slot / Shutter'],
  },
  {
    key: 'db_box',
    seq: 3,
    label: 'DB Box',
    subText: 'Main electrical distribution board, MCB circuit breakers, earth wire',
    icon: Box,
    recommendedAngles: ['Door Open View', 'MCB Breaker Ratings', 'Earthing Bus Bar'],
  },
  {
    key: 'isolation_transformer',
    seq: 4,
    label: 'Isolation Transformer (IT)',
    subText: 'Heavy transformer chassis, input/output terminal connectors, neutral-earth bond',
    icon: Zap,
    recommendedAngles: ['Front Rating Plate', 'Terminal Connections', 'Earthing Terminal'],
  },
  {
    key: 'stabilizer',
    seq: 5,
    label: 'Stabilizer',
    subText: 'Servo voltage stabilizer unit, digital volt meters, bypass switch',
    icon: Cpu,
    recommendedAngles: ['Digital Voltage Display', 'Terminal Block', 'Chassis Serial Tag'],
  },
  {
    key: 'ups',
    seq: 6,
    label: 'UPS',
    subText: 'Online UPS rack chassis, front LCD control panel, DC circuit breaker',
    icon: BatteryCharging,
    recommendedAngles: ['Front LCD Panel', 'Rear Power Sockets', 'Serial Number Label'],
  },
  {
    key: 'battery',
    seq: 7,
    label: 'Battery',
    subText: 'SMF battery bank, inter-cell connecting leads, terminal grease caps',
    icon: BatteryCharging,
    recommendedAngles: ['Battery Bank Overview', 'Terminal Connectors', 'Manufacturing Date Code'],
  },
  {
    key: 'battery_cage',
    seq: 8,
    label: 'Battery Cage',
    subText: 'Heavy gauge security cage enclosure, padlock hasp, ventilation spacing',
    icon: Box,
    recommendedAngles: ['Front Locked View', 'Padlock / Hasp Close-up', 'Base Anchor Bolts'],
  },
  {
    key: 'vsat_router',
    seq: 9,
    label: 'V-SAT / Router',
    subText: 'IDU satellite modem or 4G LTE cellular router, LED status indicators',
    icon: Radio,
    recommendedAngles: ['Front Panel LEDs', 'Rear LAN / RF Port', 'MAC / Serial Label'],
  },
  {
    key: 'vsat_router_company',
    seq: 10,
    label: 'V-SAT / Router Company',
    subText: 'Provider branding plate (Nelco/Hughes/Airtel/Tata) or outdoor antenna dish',
    icon: Radio,
    recommendedAngles: ['Provider Logo / Tag', 'Outdoor Antenna Alignment', 'ODU / BUC Transmitter'],
  },
  {
    key: 'camera',
    seq: 11,
    label: 'Camera',
    subText: 'ATM pinhole camera, ceiling dome surveillance camera, field-of-view angle',
    icon: Camera,
    recommendedAngles: ['Pinhole / Fascia Cam', 'Room Surveillance Dome', 'Cable Conduit'],
  },
  {
    key: 'dvr',
    seq: 12,
    label: 'DVR',
    subText: 'Digital video recorder unit, video signal BNC cables, power status LED',
    icon: HardDrive,
    recommendedAngles: ['Front Indicator Lights', 'Rear BNC Video Ports', 'HDD Status LED'],
  },
]

const ANGLE_OPTIONS = [
  'Front Angle',
  'Serial Plate / Tag',
  'Wiring / Connections',
  'Side / Enclosure',
  'Overall Perspective',
]

interface AtmAssetPhotoUploadProps {
  assetPhotos: Record<string, AssetPhoto[]>
  onChange: (photos: Record<string, AssetPhoto[]>) => void
  statusValues?: Record<string, string>
}


export function AtmAssetPhotoUpload({ assetPhotos, onChange, statusValues = {} }: AtmAssetPhotoUploadProps) {
  const [filterMode] = useState<'all' | 'uploaded' | 'pending'>('all')
  const [searchQuery] = useState('')
  const [selectedAngles, setSelectedAngles] = useState<Record<string, string>>({})
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    assetKey: string
    photoIndex: number
  } | null>(null)

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({})


  // Filtered Assets List
  const filteredAssets = useMemo(() => {
    return ASSET_LIST.filter((asset) => {
      const photos = assetPhotos[asset.key] || []
      const matchesSearch =
        asset.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.subText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(asset.seq).includes(searchQuery)

      if (!matchesSearch) return false
      if (filterMode === 'uploaded') return photos.length > 0
      if (filterMode === 'pending') return photos.length === 0
      return true
    })
  }, [assetPhotos, filterMode, searchQuery])

  // Handle local image file upload
  const handleFiles = (assetKey: string, files: FileList | null) => {
    if (!files || files.length === 0) return

    const angle = selectedAngles[assetKey] || 'Front Angle'
    const newPhotos: AssetPhoto[] = []
    let processed = 0

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || ''
        const sizeKb = Math.round(file.size / 1024)
        const sizeLabel = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`

        newPhotos.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          dataUrl,
          size: sizeLabel,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          angle,
        })

        processed++
        if (processed === files.length) {
          const updated = {
            ...assetPhotos,
            [assetKey]: [...(assetPhotos[assetKey] || []), ...newPhotos],
          }
          onChange(updated)
          toast(
            `${files.length} photograph${files.length > 1 ? 's' : ''} uploaded for ${ASSET_LIST.find((a) => a.key === assetKey)?.label
            }`,
            'success'
          )
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // Remove one photo
  const handleRemovePhoto = (assetKey: string, photoId: string) => {
    const list = assetPhotos[assetKey] || []
    const updatedList = list.filter((p) => p.id !== photoId)
    const updated = { ...assetPhotos, [assetKey]: updatedList }
    onChange(updated)
    toast('Photograph removed', 'info')
  }

  // Lightbox helpers
  const currentAssetPhotos = lightboxPhoto ? assetPhotos[lightboxPhoto.assetKey] || [] : []
  const activeLightboxPhoto =
    lightboxPhoto && currentAssetPhotos.length > 0 ? currentAssetPhotos[lightboxPhoto.photoIndex] : null
  const currentAssetMeta = lightboxPhoto ? ASSET_LIST.find((a) => a.key === lightboxPhoto.assetKey) : null

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">

      {/* ── 12 Assets Card Grid ── */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAssets.map((asset) => {
          const photos = assetPhotos[asset.key] || []
          const isDone = photos.length > 0
          const currentFormStatus = statusValues[asset.key]
          const activeAngle = selectedAngles[asset.key] || 'Front Angle'
          const AssetIcon = asset.icon

          return (
            <div
              key={asset.key}
              className={cn(
                'rounded-xl border bg-white p-4 transition-all duration-200 shadow-2xs flex flex-col justify-between',
                isDone ? 'border-slate-200 hover:border-blue-300' : 'border-dashed border-slate-300 hover:border-slate-400'
              )}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 font-bold text-[11px] text-[#0066FF] border border-blue-100 shrink-0">
                      {asset.seq}
                    </span>
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                        <AssetIcon size={14} className="text-slate-600 shrink-0" />
                        <span>{asset.label}</span>
                      </h4>
                      <p className="text-[10.5px] text-slate-500 line-clamp-1">{asset.subText}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {currentFormStatus && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {currentFormStatus}
                      </span>
                    )}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10.5px] font-bold',
                        isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {photos.length} Photo{photos.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Uploaded Photos Thumbnails Gallery */}
                {photos.length > 0 ? (
                  <div className="mt-3.5 grid grid-cols-3 gap-2">
                    {photos.map((p, idx) => (
                      <div
                        key={p.id}
                        className="group relative aspect-4/3 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-2xs"
                        onClick={() => setLightboxPhoto({ assetKey: asset.key, photoIndex: idx })}
                      >
                        <img
                          src={p.dataUrl}
                          alt={p.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Gradient shade */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 group-hover:from-black/85 transition-colors" />

                        {/* Angle Pill */}
                        <div className="absolute top-1 left-1 max-w-[80%]">
                          <span className="rounded bg-black/60 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-medium text-white truncate block">
                            {p.angle || 'Photo'}
                          </span>
                        </div>

                        {/* Action buttons on hover */}
                        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemovePhoto(asset.key, p.id)
                            }}
                            className="h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-sm"
                            title="Delete photo"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>

                        {/* Bottom file metadata */}
                        <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[9px] text-white/80">
                          <span className="truncate max-w-[65%]">{p.name}</span>
                          <span className="flex items-center gap-0.5 text-blue-200">
                            <Eye size={9} /> View
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 text-center">
                    <p className="text-[11.5px] text-slate-500 font-medium">No photographs uploaded</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Recommended: {asset.recommendedAngles.join(' • ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Controls for this Asset */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                {/* Angle Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Angle:</span>
                  <select
                    value={activeAngle}
                    onChange={(e) =>
                      setSelectedAngles((prev) => ({ ...prev, [asset.key]: e.target.value }))
                    }
                    className="h-7 text-[11px] rounded-md border border-slate-200 bg-white px-2 text-slate-700 outline-none focus:border-[#0066FF]"
                  >
                    {ANGLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upload Buttons */}
                <div className="flex items-center gap-1.5">
                  {/* Camera file input (Hidden) */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={(el) => {
                      cameraInputRefs.current[asset.key] = el
                    }}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      handleFiles(asset.key, e.target.files)
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-[11px] text-slate-700 hover:text-slate-900 border-slate-200"
                    onClick={() => cameraInputRefs.current[asset.key]?.click()}
                    title="Take photo using camera"
                  >
                    <Camera size={12} className="mr-1 text-slate-500" /> Camera
                  </Button>

                  {/* Multi-file browse input (Hidden) */}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={(el) => {
                      fileInputRefs.current[asset.key] = el
                    }}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      handleFiles(asset.key, e.target.files)
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    className="h-7 px-2.5 text-[11px] font-semibold bg-[#0066FF] hover:bg-blue-700 text-white"
                    onClick={() => fileInputRefs.current[asset.key]?.click()}
                  >
                    <UploadCloud size={12} className="mr-1" /> Add Photos
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Lightbox / Image Preview Modal ── */}
      {lightboxPhoto && activeLightboxPhoto && currentAssetMeta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-950/80 text-white">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0066FF] text-white font-bold text-[11px]">
                  {currentAssetMeta.seq}
                </span>
                <div>
                  <h4 className="text-[14px] font-bold tracking-tight text-white flex items-center gap-2">
                    <span>{currentAssetMeta.label}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-blue-300">
                      {activeLightboxPhoto.angle || 'Inspection View'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Photo {lightboxPhoto.photoIndex + 1} of {currentAssetPhotos.length} • {activeLightboxPhoto.name} ({activeLightboxPhoto.size})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activeLightboxPhoto.dataUrl}
                  download={activeLightboxPhoto.name}
                  className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11.5px] font-medium inline-flex items-center gap-1.5 transition-colors"
                  title="Download photo"
                >
                  <Download size={13} /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Image Body with Prev/Next Navigation */}
            <div className="relative flex-1 bg-black flex items-center justify-center p-4 min-h-[360px] max-h-[65vh] overflow-hidden">
              <img
                src={activeLightboxPhoto.dataUrl}
                alt={activeLightboxPhoto.name}
                className="max-h-full max-w-full object-contain rounded-lg"
              />

              {/* Prev Button */}
              {currentAssetPhotos.length > 1 && lightboxPhoto.photoIndex > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxPhoto((prev) =>
                      prev ? { ...prev, photoIndex: prev.photoIndex - 1 } : null
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Next Button */}
              {currentAssetPhotos.length > 1 &&
                lightboxPhoto.photoIndex < currentAssetPhotos.length - 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxPhoto((prev) =>
                        prev ? { ...prev, photoIndex: prev.photoIndex + 1 } : null
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-[11.5px] text-slate-400">
              <div className="flex items-center gap-2">
                <span>Mapped Asset: <strong className="text-white">{currentAssetMeta.label}</strong></span>
                <span>•</span>
                <span>Uploaded: <strong className="text-white">{activeLightboxPhoto.uploadedAt}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                {currentAssetPhotos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setLightboxPhoto((prev) => (prev ? { ...prev, photoIndex: i } : null))
                    }
                    className={cn(
                      'h-2 rounded-full transition-all',
                      i === lightboxPhoto.photoIndex ? 'w-6 bg-[#0066FF]' : 'w-2 bg-white/30 hover:bg-white/50'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
