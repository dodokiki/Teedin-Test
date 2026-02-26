import { useLanguage } from "@/contexts/language-context";
import { useCallback, useEffect, useRef, useState } from "react";

type MapLocation = {
  ที่อยู่: string;
  ละติจูด: number;
  ลองจิจูด: number;
};

type GoogleLatLng = {
  lat(): number;
  lng(): number;
};

interface GoogleMapMouseEvent {
  latLng: GoogleLatLng;
}

interface GoogleMapInstance {
  setCenter(location: GoogleLatLng): void;
  addListener(
    eventName: string,
    handler: (event: GoogleMapMouseEvent) => void
  ): void;
}

interface GoogleMarkerInstance {
  setPosition(position: GoogleLatLng): void;
  addListener(
    eventName: string,
    handler: (event: GoogleMapMouseEvent) => void
  ): void;
}

interface GoogleGeocoderResult {
  formatted_address: string;
  geometry: {
    location: GoogleLatLng;
  };
}

type GoogleGeocoderRequest = { address: string } | { location: GoogleLatLng };

interface GoogleGeocoder {
  geocode(
    request: GoogleGeocoderRequest,
    callback: (results: GoogleGeocoderResult[], status: string) => void
  ): void;
}

interface GoogleAutocomplete {
  addListener(eventName: "place_changed", handler: () => void): void;
  getPlace(): {
    formatted_address?: string;
    geometry?: {
      location: GoogleLatLng;
    };
  };
}

interface GoogleMapsNamespace {
  Map: new (
    element: HTMLElement,
    options: {
      center: { lat: number; lng: number };
      zoom: number;
      mapTypeControl: boolean;
      streetViewControl: boolean;
      fullscreenControl: boolean;
    }
  ) => GoogleMapInstance;
  Marker: new (options: {
    position: { lat: number; lng: number };
    map: GoogleMapInstance;
    draggable: boolean;
  }) => GoogleMarkerInstance;
  Geocoder: new () => GoogleGeocoder;
  places?: {
    Autocomplete: new (input: HTMLInputElement) => GoogleAutocomplete;
  };
}

interface MapPickerProps {
  onLocationSelect: (location: MapLocation) => void;
  initialLocation?: MapLocation;
}

export default function MapPicker({
  onLocationSelect,
  initialLocation,
}: MapPickerProps) {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const googleMapRef = useRef<GoogleMapInstance | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const autocompleteRef = useRef<GoogleAutocomplete | null>(null);

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google?.maps) {
        setMapLoaded(true);
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        "script[data-google-maps]"
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => setMapLoaded(true), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.setAttribute("data-google-maps", "true");
      script.onload = () => setMapLoaded(true);
      script.onerror = () => {
        console.error("Failed to load Google Maps API");
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  const initializeMap = useCallback(() => {
    if (!window.google?.maps || !mapRef.current) {
      return;
    }

    const defaultLocation: MapLocation = selectedLocation || {
      ที่อยู่: "กรุงเทพมหานคร",
      ละติจูด: 13.7563,
      ลองจิจูด: 100.5018,
    };

    const mapOptions = {
      center: { lat: defaultLocation.ละติจูด, lng: defaultLocation.ลองจิจูด },
      zoom: 15,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    };

    const map = new window.google.maps.Map(mapRef.current, mapOptions);
    googleMapRef.current = map;

    const marker = new window.google.maps.Marker({
      position: { lat: defaultLocation.ละติจูด, lng: defaultLocation.ลองจิจูด },
      map,
      draggable: true,
    });
    markerRef.current = marker;

    const geocoder = new window.google.maps.Geocoder();

    const updateLocationFromLatLng = (latLng: GoogleLatLng) => {
      geocoder.geocode(
        { location: latLng },
        (results: GoogleGeocoderResult[], status: string) => {
          const firstResult = results?.[0];
          if (status === "OK" && firstResult) {
            const address = firstResult.formatted_address;
            const location: MapLocation = {
              ที่อยู่: address,
              ละติจูด: latLng.lat(),
              ลองจิจูด: latLng.lng(),
            };

            setSelectedLocation(location);
            setSearchQuery(address);
          }
        }
      );
    };

    map.addListener("click", (event: GoogleMapMouseEvent) => {
      if (!event.latLng) return;
      marker.setPosition(event.latLng);
      updateLocationFromLatLng(event.latLng);
    });

    marker.addListener("dragend", (event: GoogleMapMouseEvent) => {
      if (!event.latLng) return;
      updateLocationFromLatLng(event.latLng);
    });

    if (window.google.maps.places && searchInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        searchInputRef.current
      ) as GoogleAutocomplete;
      autocompleteRef.current = autocomplete;

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const location = place.geometry?.location;

        if (location) {
          const nextLocation: MapLocation = {
            ที่อยู่: place.formatted_address || t("address_not_found"),
            ละติจูด: location.lat(),
            ลองจิจูด: location.lng(),
          };

          setSelectedLocation(nextLocation);
          setSearchQuery(place.formatted_address || "");
          map.setCenter(location);
          marker.setPosition(location);
        }
      });
    }
  }, [selectedLocation, t]);

  useEffect(() => {
    setSelectedLocation(initialLocation);
    setSearchQuery(initialLocation?.ที่อยู่ || "");
  }, [initialLocation]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      googleMapRef.current = null;
      markerRef.current = null;
      autocompleteRef.current = null;
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (mapLoaded && isModalOpen && mapRef.current && !googleMapRef.current) {
      initializeMap();
    }
  }, [initializeMap, isModalOpen, mapLoaded]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !window.google?.maps) {
      return;
    }

    setIsSearching(true);
    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode(
      { address: searchQuery },
      (results: GoogleGeocoderResult[], status: string) => {
        setIsSearching(false);

        const firstResult = results?.[0];
        const locationPoint = firstResult?.geometry?.location;

        if (status === "OK" && firstResult && locationPoint) {
          const location: MapLocation = {
            ที่อยู่: firstResult.formatted_address,
            ละติจูด: locationPoint.lat(),
            ลองจิจูด: locationPoint.lng(),
          };

          setSelectedLocation(location);

          if (googleMapRef.current && markerRef.current) {
            googleMapRef.current.setCenter(locationPoint);
            markerRef.current.setPosition(locationPoint);
          }
        } else {
          alert(t("map_pick_search_not_found"));
        }
      }
    );
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      setIsModalOpen(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSearchQuery(selectedLocation?.ที่อยู่ || "");
  };

  return (
    <div className="w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full p-4 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl"></span>
          <div className="flex-1">
            <div className="font-medium">
              {selectedLocation
                ? t("map_pick_open_edit")
                : t("map_pick_open_select")}
            </div>
            <div className="text-sm text-gray-600">
              {selectedLocation
                ? selectedLocation.ที่อยู่
                : t("map_pick_not_selected")}
            </div>
          </div>
          {selectedLocation && (
            <span
              className="text-blue-500 text-lg"
              title={t("map_pick_open_edit")}
            ></span>
          )}
        </div>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {t("map_pick_title")}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Search Section */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex gap-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t("map_pick_search_placeholder")}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={e => e.key === "Enter" && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSearching ? "..." : t("map_pick_search_button")}
                </button>
              </div>
            </div>

            {/* Map Section */}
            <div className="relative">
              <div ref={mapRef} className="w-full h-96 bg-gray-200">
                {!mapLoaded && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-600">
                      <div className="text-4xl mb-2">🗺️</div>
                      <div className="text-sm">{t("map_pick_loading")}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 px-3 py-2 rounded-md text-sm text-gray-700">
                💡 {t("map_pick_instructions")}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-gray-600">
                {selectedLocation ? (
                  <div>
                    <div className="font-medium">
                      {t("map_pick_selected_address_label")}
                    </div>
                    <div>{selectedLocation.ที่อยู่}</div>
                    <div className="text-xs text-gray-500">
                      {t("map_pick_coordinates_label")}{" "}
                      {selectedLocation.ละติจูด.toFixed(6)},{" "}
                      {selectedLocation.ลองจิจูด.toFixed(6)}
                    </div>
                  </div>
                ) : (
                  t("map_pick_select_prompt")
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedLocation}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("confirm_select_location")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
