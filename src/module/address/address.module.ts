import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { GoogleMapsModule } from '../../common/config/google-map/google-maps.module';

@Module({
  imports: [GoogleMapsModule], // ← add this
  controllers: [AddressController],
  providers: [AddressService],
})
export class AddressModule {}
