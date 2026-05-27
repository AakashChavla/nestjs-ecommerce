import { Module } from '@nestjs/common';
import { GoogleMapsModule } from '../../common/config/google-map/google-maps.module';
import { AddressController } from './address.controller';
import { AddressRepository } from './address.repository';
import { AddressService } from './address.service';

@Module({
  imports: [GoogleMapsModule],
  controllers: [AddressController],
  providers: [AddressService, AddressRepository],
})
export class AddressModule {}
