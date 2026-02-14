import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export default function MapView({ solicitations = [], organizations = [], zipScores = [], center, zoom, height = '400px' }) {
  const mapCenter = center || [37.0, -90.0]
  const mapZoom = zoom || 5

  const getNeedColor = (score) => {
    if (score >= 80) return '#dc2626'
    if (score >= 60) return '#ea580c'
    if (score >= 40) return '#eab308'
    return '#22c55e'
  }

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-slate-200">
      <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {zipScores.map(z => (
          <CircleMarker
            key={z.zip_code}
            center={[z.lat, z.lng]}
            radius={Math.max(6, z.need_score / 8)}
            pathOptions={{
              fillColor: getNeedColor(z.need_score),
              color: getNeedColor(z.need_score),
              fillOpacity: 0.35,
              weight: 1,
            }}
          >
            <Popup>
              <strong>{z.city}, {z.state} {z.zip_code}</strong><br />
              Need Score: {z.need_score}/100<br />
              Food Insecurity: {(z.food_insecurity_rate * 100).toFixed(0)}%<br />
              Pop: {z.population?.toLocaleString()}
            </Popup>
          </CircleMarker>
        ))}

        {solicitations.map(s => (
          <Marker key={`sol-${s.id}`} position={[s.lat, s.lng]} icon={blueIcon}>
            <Popup>
              <strong>{s.title}</strong><br />
              {s.agency}<br />
              {s.zip_code}
            </Popup>
          </Marker>
        ))}

        {organizations.map(o => (
          <Marker key={`org-${o.id}`} position={[o.lat, o.lng]} icon={greenIcon}>
            <Popup>
              <strong>{o.name}</strong><br />
              {o.org_type}<br />
              {o.zip_code}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
