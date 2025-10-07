interface LocationLinksProps {
  address: string
}

function buildGoogleMapsUrl(address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`
}

function buildWazeUrl(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}`
}

export function LocationLinks({ address }: LocationLinksProps): JSX.Element {
  return (
    <div className="location-links">
      <a
        className="location-link"
        href={buildGoogleMapsUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Google Maps
      </a>
      <a className="location-link" href={buildWazeUrl(address)} target="_blank" rel="noopener noreferrer">
        Waze
      </a>
    </div>
  )
}
