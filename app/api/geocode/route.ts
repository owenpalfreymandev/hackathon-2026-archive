import { NextRequest, NextResponse } from "next/server"

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim()

  if (!query || query.length < 3) {
    return NextResponse.json(
      { error: "Enter at least three characters." },
      { status: 400 }
    )
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search")
  nominatimUrl.searchParams.set("q", query)
  nominatimUrl.searchParams.set("format", "jsonv2")
  nominatimUrl.searchParams.set("addressdetails", "1")
  nominatimUrl.searchParams.set("countrycodes", "je")
  nominatimUrl.searchParams.set("limit", "5")

  try {
    const response = await fetch(nominatimUrl, {
      headers: {
        Accept: "application/json",
        Referer: request.nextUrl.origin,
        "User-Agent": "Fpark-Hackathon/1.0",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Address search is temporarily unavailable." },
        { status: 502 }
      )
    }

    const data = (await response.json()) as NominatimResult[]
    const results = data
      .map((result) => ({
        id: String(result.place_id),
        displayName: result.display_name,
        lat: Number(result.lat),
        lng: Number(result.lon),
      }))
      .filter(
        (result) => Number.isFinite(result.lat) && Number.isFinite(result.lng)
      )

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json(
      { error: "Address search is temporarily unavailable." },
      { status: 502 }
    )
  }
}
