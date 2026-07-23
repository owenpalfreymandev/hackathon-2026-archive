"use client"

import { useEffect, useRef, useState } from "react"
import { MapPinIcon } from "lucide-react"

import {
  DEFAULT_MAP_ZOOM,
  JERSEY_BOUNDS,
  JERSEY_CENTER,
  PIN_MAP_ZOOM,
  isWithinJersey,
  type Coordinates,
} from "@/lib/coordinates"
import { cn } from "@/lib/utils"

export type LocationMarker = {
  id: string
  lat: number
  lng: number
  colour?: "red" | "blue" | "amber"
  title?: string
  label?: string
  disabled?: boolean
}

type LocationPickerProps = {
  value: Coordinates | null
  onChange?: (coords: Coordinates) => void
  markers?: LocationMarker[]
  onMarkerClick?: (id: string) => void
  interactive?: boolean
  className?: string
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"

type LeafletMap = {
  setView: (coords: [number, number], zoom: number) => LeafletMap
  setMaxBounds: (bounds: Array<[number, number]>) => LeafletMap
  setMinZoom: (zoom: number) => LeafletMap
  fitBounds: (
    bounds: Array<[number, number]>,
    options?: { padding?: [number, number]; maxZoom?: number }
  ) => LeafletMap
  on: (
    event: string,
    handler: (e: { latlng: { lat: number; lng: number } }) => void
  ) => void
  remove: () => void
}

type LeafletMarker = {
  setLatLng: (coords: [number, number]) => void
  getLatLng: () => { lat: number; lng: number }
  on: (event: string, handler: () => void) => void
  addTo: (map: LeafletMap) => LeafletMarker
  remove: () => void
}

type LeafletPolyline = {
  addTo: (map: LeafletMap) => LeafletPolyline
  remove: () => void
}

type LeafletModule = {
  map: (
    element: HTMLElement,
    options?: {
      maxBounds?: Array<[number, number]>
      maxBoundsViscosity?: number
      minZoom?: number
    }
  ) => LeafletMap
  tileLayer: (
    url: string,
    options: { attribution: string }
  ) => { addTo: (map: LeafletMap) => void }
  marker: (
    coords: [number, number],
    options: {
      draggable: boolean
      icon: unknown
      title?: string
      alt?: string
    }
  ) => LeafletMarker
  polyline: (
    coords: Array<[number, number]>,
    options: { color: string; weight: number; dashArray: string }
  ) => LeafletPolyline
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
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

    const existingScript = document.querySelector(
      'script[data-leaflet="true"]'
    )

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.L) resolve(window.L)
        else reject(new Error("Leaflet failed to load"))
      })
      existingScript.addEventListener("error", () =>
        reject(new Error("Leaflet failed to load"))
      )
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

function createPinIcon(
  L: LeafletModule,
  colour: "red" | "blue" | "green" | "amber",
  label?: string,
  disabled = false
) {
  const colourValue = {
    red: "#dc2626",
    blue: "#2563eb",
    green: "#16a34a",
    amber: "#d97706",
  }[colour]

  const safeLabel = label ? escapeHtml(label) : null
  const iconWidth = safeLabel ? 112 : 36
  const iconHeight = safeLabel ? 62 : 36
  const opacity = disabled ? 0.68 : 1

  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;width:${iconWidth}px;height:${iconHeight}px;opacity:${opacity};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.32));">
      ${
        safeLabel
          ? `<div style="white-space:nowrap;border:2px solid ${colourValue};border-radius:999px;background:white;color:#111827;padding:2px 7px;font:700 12px/1.25 system-ui,sans-serif;margin-bottom:-2px;">${safeLabel}</div>`
          : ""
      }
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${colourValue}" stroke="white" stroke-width="1.5" aria-hidden="true">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
        <circle cx="12" cy="10" r="3" fill="white"/>
      </svg>
    </div>`,
    iconSize: [iconWidth, iconHeight],
    iconAnchor: [iconWidth / 2, iconHeight],
  })
}

export function LocationPicker({
  value,
  onChange,
  markers = [],
  onMarkerClick,
  interactive = true,
  className,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const searchMarkerRef = useRef<LeafletMarker | null>(null)
  const spaceMarkersRef = useRef<Map<string, LeafletMarker>>(new Map())
  const lineRef = useRef<LeafletPolyline | null>(null)
  const leafletRef = useRef<LeafletModule | null>(null)
  const onChangeRef = useRef(onChange)
  const onMarkerClickRef = useRef(onMarkerClick)
  const valueRef = useRef(value)
  const markersRef = useRef(markers)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
    onMarkerClickRef.current = onMarkerClick
    valueRef.current = value
    markersRef.current = markers
  }, [markers, onChange, onMarkerClick, value])

  const fitMapToContent = (map: LeafletMap) => {
    const points: Array<[number, number]> = []

    if (valueRef.current) {
      points.push([valueRef.current.lat, valueRef.current.lng])
    }

    for (const marker of markersRef.current) {
      points.push([marker.lat, marker.lng])
    }

    if (points.length === 0) {
      map.setView([JERSEY_CENTER.lat, JERSEY_CENTER.lng], DEFAULT_MAP_ZOOM)
      return
    }

    if (points.length === 1) {
      map.setView(points[0], PIN_MAP_ZOOM)
      return
    }

    map.fitBounds(points, { padding: [52, 52], maxZoom: PIN_MAP_ZOOM })
  }

  const placeSearchMarker = (lat: number, lng: number, map: LeafletMap) => {
    const L = leafletRef.current
    if (!L) return

    if (searchMarkerRef.current) {
      searchMarkerRef.current.setLatLng([lat, lng])
      return
    }

    searchMarkerRef.current = L.marker([lat, lng], {
      draggable: true,
      icon: createPinIcon(L, "green"),
      title: "Your search location",
      alt: "Your search location",
    }).addTo(map)

    searchMarkerRef.current.on("dragend", () => {
      const position = searchMarkerRef.current!.getLatLng()
      const coordinates = { lat: position.lat, lng: position.lng }
      if (isWithinJersey(coordinates)) {
        onChangeRef.current?.(coordinates)
      }
    })
  }

  const renderSpaceMarkers = (map: LeafletMap) => {
    const L = leafletRef.current
    if (!L) return

    for (const marker of spaceMarkersRef.current.values()) {
      marker.remove()
    }
    spaceMarkersRef.current.clear()

    lineRef.current?.remove()
    lineRef.current = null

    for (const markerData of markersRef.current) {
      const marker = L.marker([markerData.lat, markerData.lng], {
        draggable: false,
        icon: createPinIcon(
          L,
          markerData.colour ?? "red",
          markerData.label,
          markerData.disabled
        ),
        title: markerData.title ?? "Parking space",
        alt: markerData.title ?? "Parking space",
      }).addTo(map)

      if (!markerData.disabled) {
        marker.on("click", () => {
          onMarkerClickRef.current?.(markerData.id)
        })
      }

      spaceMarkersRef.current.set(markerData.id, marker)
    }

    const selectedMarker = markersRef.current.find(
      (marker) => marker.colour === "blue"
    )

    if (valueRef.current && selectedMarker) {
      lineRef.current = L.polyline(
        [
          [valueRef.current.lat, valueRef.current.lng],
          [selectedMarker.lat, selectedMarker.lng],
        ],
        {
          color: "#2563eb",
          weight: 3,
          dashArray: "7 7",
        }
      ).addTo(map)
    }

    fitMapToContent(map)
  }

  useEffect(() => {
    let cancelled = false

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return

        leafletRef.current = L

        const initial = valueRef.current ?? JERSEY_CENTER
        const initialZoom = valueRef.current
          ? PIN_MAP_ZOOM
          : DEFAULT_MAP_ZOOM
        const jerseyBounds: Array<[number, number]> = [
          [JERSEY_BOUNDS.south, JERSEY_BOUNDS.west],
          [JERSEY_BOUNDS.north, JERSEY_BOUNDS.east],
        ]
        const map = L.map(containerRef.current, {
          maxBounds: jerseyBounds,
          maxBoundsViscosity: 1,
          minZoom: DEFAULT_MAP_ZOOM,
        })
          .setMaxBounds(jerseyBounds)
          .setMinZoom(DEFAULT_MAP_ZOOM)
          .setView([initial.lat, initial.lng], initialZoom)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map)

        mapRef.current = map

        if (interactive && valueRef.current) {
          placeSearchMarker(valueRef.current.lat, valueRef.current.lng, map)
        }

        renderSpaceMarkers(map)

        if (interactive) {
          map.on("click", (event) => {
            const { lat, lng } = event.latlng
            const coordinates = { lat, lng }
            if (!isWithinJersey(coordinates)) return

            placeSearchMarker(lat, lng, map)
            onChangeRef.current?.(coordinates)
          })
        }

        setMapReady(true)
      })
      .catch(() => {
        // Coordinate entry and geolocation still work if map assets fail.
      })

    return () => {
      cancelled = true
      setMapReady(false)
      lineRef.current?.remove()
      lineRef.current = null
      for (const marker of spaceMarkersRef.current.values()) {
        marker.remove()
      }
      spaceMarkersRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
      searchMarkerRef.current = null
      leafletRef.current = null
    }
  }, [interactive])

  useEffect(() => {
    if (!mapReady || !value || !mapRef.current) return

    placeSearchMarker(value.lat, value.lng, mapRef.current)
    fitMapToContent(mapRef.current)
  }, [value, mapReady])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    renderSpaceMarkers(mapRef.current)
  }, [markers, mapReady])

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-md border">
        <div
          ref={containerRef}
          className={cn(
            "h-96 w-full [&_.leaflet-control-attribution]:text-[10px]",
            className
          )}
        />
        {interactive && !value && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="rounded-full bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              Click the map to choose a location
            </span>
          </div>
        )}
      </div>

      {interactive && value ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="size-4 shrink-0 text-green-600" />
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </span>
          {markers.length > 0 && (
            <span>
              Green: destination · Red: available · Blue: selected · Amber: unavailable
            </span>
          )}
        </div>
      ) : interactive ? (
        <p className="text-sm text-muted-foreground">
          Drag the green pin or click the map to choose your search point.
        </p>
      ) : null}
    </div>
  )
}
