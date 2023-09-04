"use client";

import useSwr from 'swr';
import { useMap } from "@/hooks/useMap";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { DirectionsResponseData, FindPlaceFromTextResponseData } from "@googlemaps/google-maps-services-js";
import { fetcher } from '@/util/http';
import { Route } from '@/util/model';
import { socket } from '@/util/socket-io';

const sleep = () => new Promise((resolve, reject) => setTimeout(resolve, 1000));

export default function DriverPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const map = useMap(mapContainerRef);

  const [directionsResponseData, setDirectionsResponseData] = useState<DirectionsResponseData & { request: any }>();

  const { data, error, isLoading } = useSwr<Route[]>(
    'http://localhost:3001/api/routes', 
    fetcher, {
      fallbackData: []
    }
  );

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    }
  }, []);

  async function startRoute() {
    const routeId = (document.getElementById("route") as HTMLSelectElement).value;

    const response = await fetch(`http://localhost:3001/api/routes/${routeId}`);
    
    const route: Route = await response.json();

    map?.removeAllRoutes();

    map?.addRouteWithIcons({
      routeId: routeId,
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

    const { steps } = route.directions.routes[0].legs[0];

    for(const step of steps) {
      //await sleep();
      map?.moveCar(routeId, step.start_location);

      socket.emit('new-points', {
        route_id: routeId,
        lat: step.start_location.lat,
        lng: step.start_location.lng,
      });

      //await sleep();
      map?.moveCar(routeId, step.end_location);
      socket.emit('new-points', {
        route_id: routeId,
        lat: step.end_location.lat,
        lng: step.end_location.lng,
      });
    }
  }

  return (
    <div className="flex flex-row h-full">
      <div className="space-y-5 p-5 w-[350px]">
        <h1>Minha viagem</h1>

        <div className="flex flex-col space-y-3">
          <select id="route">
            {isLoading && <option>Carregando rotas...</option>}
            {data!.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
          </select>

          <button type='submit' className="bg-cyan-500 px-4 py-2 text-white rounded" onClick={startRoute}>Iniciar a viagem</button>
        </div>
      </div>

      <div id="map" className="h-full w-full" ref={mapContainerRef}></div>
    </div>
  )
}
