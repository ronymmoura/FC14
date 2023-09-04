"use client";

import { useMap } from "@/hooks/useMap";
import { useEffect, useRef, useState } from "react";
import type { DirectionsResponseData } from "@googlemaps/google-maps-services-js";
import { socket } from '@/util/socket-io';
import { Route } from "@/util/model";

const sleep = () => new Promise((resolve, reject) => setTimeout(resolve, 1000));

export default function AdminPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const map = useMap(mapContainerRef);

  useEffect(() => {
    socket.connect();

    socket.on("admin-new-points", 
      async (data: {route_id: string; lat: number; lng: number }) => {
        if (!map?.hasRoute(data.route_id)){
          const response = await fetch(`http://localhost:3001/api/routes/${data.route_id}`);
          const route: Route = await response.json();

          map?.removeRoute(data.route_id);

          map?.addRouteWithIcons({
            routeId: data.route_id,
            startMarkerOptions: {
              position: route.directions.routes[0].legs[0].start_location
            },
            endMarkerOptions: {
              position: route.directions.routes[0].legs[0].end_location
            },
            carMarkerOptions: {
              position: route.directions.routes[0].legs[0].start_location
            },
            directionsResponseData: route.directions,
          });
        }

        map?.moveCar(data.route_id, { lat: data.lat, lng: data.lng });
      }
    );

    return () => {
      socket.disconnect();
    }
  }, [map]);

  return (
    <div className="flex flex-row h-full">
      <div id="map" className="h-full w-full" ref={mapContainerRef}></div>
    </div>
  )
}
