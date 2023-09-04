"use client";

import { useMap } from "@/hooks/useMap";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { DirectionsResponseData, FindPlaceFromTextResponseData } from "@googlemaps/google-maps-services-js";

const sleep = () => new Promise((resolve, reject) => setTimeout(resolve, 1000));

export default function NewRoutePage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const map = useMap(mapContainerRef);

  const [directionsResponseData, setDirectionsResponseData] = useState<DirectionsResponseData & { request: any }>();

  async function searchPlaces(event: FormEvent) {
    event.preventDefault();

    const source = document.querySelector<HTMLInputElement>("input[name=source_place]")?.value;
    const destination = document.querySelector<HTMLInputElement>("input[name=destination_place]")?.value;

    const [sourceResponse, destinationResponse] = await Promise.all([
      fetch(`/api/places?text=${source}`),
      fetch(`/api/places?text=${destination}`)
    ]);

    const [sourcePlace, destinationPlace]: FindPlaceFromTextResponseData[] = await Promise.all([
      sourceResponse.json(),
      destinationResponse.json()
    ]);

    if(sourcePlace.status !== "OK") {
      console.error(sourcePlace);
      alert("Não foi possível encontrar o local de origem");
      return;
    }

    if(destinationPlace.status !== "OK") {
      console.error(destinationPlace);
      alert("Não foi possível encontrar o local de destino");
      return;
    }

    const queryParams = new URLSearchParams({
      originId: sourcePlace.candidates[0].place_id!,
      destinationId: destinationPlace.candidates[0].place_id!,
    })

    const directionsResponse = await fetch(`/api/directions?${queryParams.toString()}`);
    const directions: DirectionsResponseData & { request: any } = await directionsResponse.json();

    setDirectionsResponseData(directions);

    map?.removeAllRoutes();

    map?.addRouteWithIcons({
      routeId: "1",
      startMarkerOptions: {
        position: directions.routes[0].legs[0].start_location
      },
      endMarkerOptions: {
        position: directions.routes[0].legs[0].end_location
      },
      carMarkerOptions: {
        position: directions.routes[0].legs[0].start_location
      },
      directionsResponseData: directions,
    })
  }

  async function createRoute() {
    const response = await fetch(`http://localhost:3001/api/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${directionsResponseData?.routes[0].legs[0].start_address} - ${directionsResponseData?.routes[0].legs[0].end_address}`,
        source_id: directionsResponseData?.request.origin.place_id,
        destination_id: directionsResponseData?.request.destination.place_id
      })
    });

    const route = await response.json();
  }

  return (
    <div className="flex flex-row h-full">
      <div className="space-y-5 p-5 w-[350px]">
        <h1>Nova rota</h1>

        <form className="flex flex-col space-y-3" onSubmit={searchPlaces}>
          <input name="source_place" placeholder="origem" />
          <input name="destination_place" placeholder="destino" />

          <button type='submit' className="bg-cyan-500 px-4 py-2 text-white rounded">Pesquisar</button>
        </form>

        {directionsResponseData && (
          <>
          <ul>
            <li>
              Origem: {directionsResponseData?.routes[0].legs[0].start_address}
            </li>
            <li>
              Destino: {directionsResponseData?.routes[0].legs[0].end_address}
            </li>
            <li>
              Distância: {directionsResponseData?.routes[0].legs[0].distance.text}
            </li>
            <li>
              Duration: {directionsResponseData?.routes[0].legs[0].duration.text}
            </li>
          </ul>
          <button onClick={createRoute} className="bg-cyan-500 px-4 py-2 text-white rounded">Adicionar rota</button>
          </>
        )}
      </div>

      <div id="map" className="h-full w-full" ref={mapContainerRef}></div>
    </div>
  )
}
