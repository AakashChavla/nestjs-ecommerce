import { Module } from '@nestjs/common';
import { GoogleMapsService } from './google-maps.service';

/**
 * GoogleMapsModule
 *
 * Import this into any feature module that needs geocoding:
 *
 *   @Module({
 *     imports: [GoogleMapsModule],
 *     ...
 *   })
 *   export class AddressModule {}
 *
 * Then inject GoogleMapsService via the constructor as usual.
 */
@Module({
  providers: [GoogleMapsService],
  exports: [GoogleMapsService],
})
export class GoogleMapsModule {}
