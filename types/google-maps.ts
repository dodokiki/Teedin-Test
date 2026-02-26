// Google Maps types for the application
export interface GoogleMapsMap {
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  addListener: (event: string, handler: (event: any) => void) => void;
}

export interface GoogleMapsMarker {
  setMap: (map: GoogleMapsMap | null) => void;
  setPosition: (position: { lat: number; lng: number }) => void;
}

export interface GoogleMapsGeocoder {
  geocode: (request: { location: { lat: number; lng: number } }) => Promise<{
    results: Array<{ formatted_address: string }>;
  }>;
}

export interface GoogleMapsMapMouseEvent {
  latLng: {
    lat: () => number;
    lng: () => number;
  } | null;
}

declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: any) => any;
        Marker: new (options: any) => any;
        Geocoder: new () => any;
        MapTypeId: {
          ROADMAP: string;
        };
        MapMouseEvent: any;
      };
    };
    googleMapsLoaded?: boolean;
  }
}
