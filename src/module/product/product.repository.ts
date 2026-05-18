import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/common';

@Injectable()
export class ProductRepository {
  constructor(private readonly databaseService: DatabaseService) {}
}
