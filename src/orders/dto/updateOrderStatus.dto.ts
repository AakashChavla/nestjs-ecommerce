import { IsEnum } from 'class-validator';
import { OrderStatus } from '../entities/order-status.enum';
import { Transform } from 'class-transformer';

export class UpdateOrderStatusDto {
  @Transform(({ value }) => {
    console.log('Raw status value:', value);
    return value?.toLowerCase();
  })
  @IsEnum(OrderStatus, {
    message: `Status must be one of: ${Object.values(OrderStatus).join(', ')}`,
  })
  status: OrderStatus;
}
