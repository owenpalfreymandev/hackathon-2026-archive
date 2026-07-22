"use client"

import { useEffect, useRef, useState } from "react"
import { MapPinIcon } from "lucide-react"

import {
  DEFAULT_MAP_ZOOM,
  JERSEY_CENTER,
  PIN_MAP_ZOOM,
  type Coordinates,
} from "@/lib/coordinates"

type LocationPickerProps = {
  value: Coordinates | null
  onChange: (coords: Coordinates) => void
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"

type LeafletMap = {
  setView: (coords: [number, number], zoom: number) => LeafletMap
  getZoom: () => number
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void
  remove: () => void
}

type LeafletMarker = {
  setLatLng: (coords: [number, number]) => void
  getLatLng: () => { lat: number; lng: number }
  on: (event: string, handler: () => void) => void
  addTo: (map: LeafletMap) => LeafletMarker
}

type LeafletModule = {
  map: (element: HTMLElement) => LeafletMap
  tileLayer: (
    url: string,
    options: { attribution: string }
  ) => { addTo: (map: LeafletMap) => void }
  marker: (
    coords: [number, number],
    options: { draggable: boolean; icon: unknown }
  ) => LeafletMarker
  divIcon: (options: {
    className: string
    html: string
    iconSize: [number, number]
    iconAnchor: [number, number]
  }) => unknown
}

declare global {
  interface Window {
    L?: LeafletModule
  }
}

function loadLeaflet(): Promise<LeafletModule> {
  if (window.L) {
    return Promise.resolve(window.L)
  }

  return new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet="true"]')) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = LEAFLET_CSS
      link.dataset.leaflet = "true"
      document.head.appendChild(link)
    }

    const existingScript = document.querySelector('script[data-leaflet="true"]')
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.L) resolve(window.L)
        else reject(new Error("Leaflet failed to load"))
      })
      existingScript.addEventListener("error", () => reject(new Error("Leaflet failed to load")))
      return
    }

    const script = document.createElement("script")
    script.src = LEAFLET_JS
    script.dataset.leaflet = "true"
    script.onload = () => {
      if (window.L) resolve(window.L)
      else reject(new Error("Leaflet failed to load"))
    }
    script.onerror = () => reject(new Error("Leaflet failed to load"))
    document.body.appendChild(script)
  })
}

function createPinIcon(L: LeafletModule) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;color:#dc2626;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
        <circle cx="12" cy="10" r="3" fill="white"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const leafletRef = useRef<LeafletModule | null>(null)
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  const [mapReady, setMapReady] = useState(false)

  onChangeRef.current = onChange
  valueRef.current = value

  const placeMarker = (lat: number, lng: number, map: LeafletMap) => {
    const L = leafletRef.current
    if (!L) return

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
      return
    }

    const icon = createPinIcon(L)
    markerRef.current = L.marker([lat, lng], { draggable: true, icon }).addTo(map)
    markerRef.current.on("dragend", () => {
      const pos = markerRef.current!.getLatLng()
      onChangeRef.current({ lat: pos.lat, lng: pos.lng })
    })
  }

  const syncMapToValue = (coords: Coordinates, zoom = PIN_MAP_ZOOM) => {
    const map = mapRef.current
    if (!map) return

    placeMarker(coords.lat, coords.lng, map)
    map.setView([coords.lat, coords.lng], zoom)
  }

  useEffect(() => {
    let cancelled = false

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return

        leafletRef.current = L

        const initial = valueRef.current ?? JERSEY_CENTER
        const initialZoom = valueRef.current ? PIN_MAP_ZOOM : DEFAULT_MAP_ZOOM
        const map = L.map(containerRef.current).setView(
          [initial.lat, initial.lng],
          initialZoom
        )

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map)

        mapRef.current = map

        if (valueRef.current) {
          placeMarker(valueRef.current.lat, valueRef.current.lng, map)
        }

        map.on("click", (event) => {
          const { lat, lng } = event.latlng
          placeMarker(lat, lng, map)
          onChangeRef.current({ lat, lng })
        })

        setMapReady(true)
      })
      .catch(() => {
        // Map tiles failed to load — the form still validates coordinates if set elsewhere.
      })

    return () => {
      cancelled = true
      setMapReady(false)
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
      leafletRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !value) return
    syncMapToValue(value)
  }, [value, mapReady])

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-md border">
        <div ref={containerRef} className="h-64 w-full [&_.leaflet-control-attribution]:text-[10px]" />
        {!value && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="rounded-full bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              Click the map to drop a pin
            </span>
          </div>
        )}
      </div>

      {value ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="size-4 shrink-0 text-destructive" />
          {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Drag the pin or click the map to set the parking spot.
        </p>
      )}
    </div>
  )
}
