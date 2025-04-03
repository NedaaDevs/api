import { MiddlewareConsumer, RequestMethod, NestModule } from '@nestjs/common';
import { CoordinatesService } from './coordinates/coordinates.service';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { CalendarService } from './calendar/calendar.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CalendarController } from './calendar/calendar.controller';
import { TimezoneController } from './timezone/timezone.controller';
import { TimezoneService } from './timezone/timezone.service';
import { CoordinatesController } from './coordinates/coordinates.controller';
import { LoggerMiddleware } from './logger/logger.middleware';
import { PrayerTimesModule } from '@/prayer-times/prayer-times.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 25,
      },
    ]),
    WinstonModule.forRoot({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.json(),
            winston.format.colorize(),
          ),
        }),
        new winston.transports.File({
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.json(),
            winston.format.colorize(),
          ),
        }),
      ],
    }),
    PrayerTimesModule,
    HealthModule,
  ],
  controllers: [
    AppController,
    CalendarController,
    TimezoneController,
    CoordinatesController,
  ],
  providers: [
    AppService,
    CalendarService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    TimezoneService,
    CoordinatesService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
