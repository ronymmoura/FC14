import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { MapsModule } from '../maps/maps.module';
import { RoutesDriverService } from './routes-driver/routes-driver.service';
import { RoutesGateway } from './routes/routes.gateway';
import { KafkaProducerJob } from './kafka-producer.job';
import { NewPointsJob } from './new-points.job';

@Module({
  imports: [
    MapsModule,
    BullModule.registerQueue(
      { name: 'new-points' },
      { name: 'kafka-producer' },
    ),
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'nest',
            brokers: ['kafka:9094'],
          },
        },
      },
    ]),
  ],
  controllers: [RoutesController],
  providers: [
    RoutesService,
    RoutesDriverService,
    RoutesGateway,
    NewPointsJob,
    KafkaProducerJob,
    makeCounterProvider({
      name: 'route_started_counter',
      help: 'Number of routes started',
    }),
    makeCounterProvider({
      name: 'route_finished_counter',
      help: 'Number of routes finished',
    }),
  ],
})
export class RoutesModule {}
