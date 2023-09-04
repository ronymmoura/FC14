import { Injectable } from '@nestjs/common';

import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { DirectionsService } from '../maps/directions/directions.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class RoutesService {
  constructor(
    private prismaService: PrismaService,
    private directionsService: DirectionsService,
    @InjectQueue('kafka-producer') private kafkaProducerQueue: Queue,
  ) {}

  async create(createRouteDto: CreateRouteDto) {
    const { available_travel_modes, geocoded_waypoints, routes, request } =
      await this.directionsService.getDirections(
        createRouteDto.source_id,
        createRouteDto.destination_id,
      );

    const legs = routes[0].legs[0];

    const routeCreated = await this.prismaService.route.create({
      data: {
        name: createRouteDto.name,
        source: {
          name: legs.start_address,
          location: {
            lat: legs.start_location.lat,
            lng: legs.start_location.lng,
          },
        },
        destination: {
          name: legs.end_address,
          location: {
            lat: legs.end_location.lat,
            lng: legs.end_location.lng,
          },
        },
        distance: legs.distance.value,
        duration: legs.duration.value,
        directions: JSON.stringify({
          available_travel_modes,
          geocoded_waypoints,
          routes,
          request,
        }),
      },
    });

    await this.kafkaProducerQueue.add({
      event: 'RouteCreated',
      id: routeCreated.id,
      name: routeCreated.name,
      distance: routeCreated.distance,
    });

    return routeCreated;
  }

  findAll() {
    return this.prismaService.route.findMany();
  }

  findOne(id: string) {
    return this.prismaService.route.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, updateRouteDto: UpdateRouteDto) {
    return this.prismaService.route.update({
      where: {
        id,
      },
      data: {
        name: updateRouteDto.name,
        source: {
          name: 'nome origem',
          location: {
            lat: 0,
            lng: 0,
          },
        },
        destination: {
          name: 'nome origem',
          location: {
            lat: 0,
            lng: 0,
          },
        },
        distance: 0,
        duration: 0,
        directions: {},
      },
    });
  }

  remove(id: string) {
    return this.prismaService.route.delete({ where: { id } });
  }
}
