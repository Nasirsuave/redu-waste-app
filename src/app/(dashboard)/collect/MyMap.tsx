'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function extractLatLng(locationString: string): [number, number] | null {
  const match = locationString.match(/Lat:\s*([-.\d]+),\s*Lng:\s*([-.\d]+)/);
  if (match) {
    return [parseFloat(match[1]), parseFloat(match[2])];
  }
  return null;
}

const MyMap = ({ exactLocation }: { exactLocation: string }) => {
  const coordinates = extractLatLng(exactLocation);

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  if (!coordinates) return <p>Invalid coordinates</p>;

  const [lat, lng] = coordinates;

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <MapContainer center={[lat, lng]} zoom={13} style={{ height: "300px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Marker position={[lat, lng]}>
          <Popup>Exact Location</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MyMap;
