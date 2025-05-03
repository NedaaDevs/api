import { Module } from '@nestjs/common';
import { ReverseGeocodeController } from '@/reverse-geocode/reverse-geocode.controller';
import { ReverseGeocodeService } from '@/reverse-geocode/reverse-geocode.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [ReverseGeocodeController],
  providers: [ReverseGeocodeService],
})
export class ReverseGeocodeModule {}
