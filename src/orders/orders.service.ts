import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatus } from './entities/order-status.enum';
import { CreateOrderDto } from './dto/createOrder.dto';
import { UsersService } from '../users/users.service';
import { ProductsService } from '../products/products.service';
import { CommonResponse } from '../template/response';
import { Product } from '../products/product.entity';
import { UpdateOrderStatusDto } from './dto/updateOrderStatus.dto';
import { User } from '../users/user.entity';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,

        @InjectRepository(OrderItem)
        private orderItemRepository: Repository<OrderItem>,

        @InjectRepository(Product)
        private productRepository: Repository<Product>,

        @InjectRepository(User)
        private userRepository: Repository<User>,

        private usersService: UsersService,
        private productsService: ProductsService,
        private readonly dataSource: DataSource,

        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
    ) { }

    async createOrder(createOrderDto: CreateOrderDto): Promise<CommonResponse> {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { userId, items } = createOrderDto;

            // Validate user exists
            const user = await this.usersService.findOneById(userId);
            if (!user) {
                await queryRunner.rollbackTransaction();
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'User not found',
                };
            }

            const orderItems: OrderItem[] = [];
            let total = 0;

            for (const item of items) {
                // Lock product row for update to prevent race conditions
                const product = await queryRunner.manager.findOneOrFail(Product, {
                    where: { id: item.productId },
                    lock: { mode: 'pessimistic_write' },
                });

                if (product.quantity < item.quantity) {
                    await queryRunner.rollbackTransaction();
                    return {
                        status: HttpStatus.BAD_REQUEST,
                        message: `Insufficient stock for product ${product.name}`,
                    };
                }

                // Deduct stock quantity
                product.quantity -= item.quantity;
                await queryRunner.manager.save(product);

                // Create order item entity
                const orderItem = queryRunner.manager.create(OrderItem, {
                    product,
                    quantity: item.quantity,
                    price: product.price,
                });

                orderItems.push(orderItem);
                total += orderItem.price * orderItem.quantity;
            }

            // Create order entity and link items
            const order = queryRunner.manager.create(Order, {
                user,
                status: OrderStatus.Placed,
                total,
                items: orderItems,
            });

            // Save order with cascade save of order items
            const savedOrder = await queryRunner.manager.save(order);

            // Commit transaction after all operations succeeded
            await queryRunner.commitTransaction();

            return {
                status: HttpStatus.CREATED,
                message: 'Order created successfully',
                data: savedOrder,
            };
        } catch (error) {
            // Rollback transaction on error
            await queryRunner.rollbackTransaction();
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error creating order',
                error: error.message,
            };
        } finally {
            // Release query runner to prevent memory leaks
            await queryRunner.release();
        }
    }

    async findAllOrders(): Promise<CommonResponse> {
        try {
            const orderData = await this.orderRepository.find({
                relations: ['user', 'items', 'items.product'],
            })
            if (!orderData || orderData.length === 0) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'No orders found',
                }
            }
            return {
                status: HttpStatus.OK,
                message: 'Orders fetched successfully',
                data: orderData,
            }
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error fetching orders',
                error: error.message,
            }
        }
    }

    async findOrdersByUserId(userId: string): Promise<CommonResponse> {
        try {
            const orders = await this.orderRepository.findBy({
                user: { id: userId },
            });

            if (!orders.length) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'No orders found for this user',
                    data: [],
                };
            }

            // Optionally, if relations needed (e.g. items, products), use find with relations:
            const ordersWithRelations = await this.orderRepository.find({
                where: { user: { id: userId } },
                relations: ['items', 'items.product'],
            });

            return {
                status: HttpStatus.OK,
                message: 'Orders fetched successfully',
                data: ordersWithRelations,
            };
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error fetching user orders',
                error: error.message,
            };
        }
    }

    async findOrderById(orderId: string, userId: string): Promise<CommonResponse> {
        try {
            // Step 1: Verify ownership before fetching full data
            const order = await this.orderRepository.findOne({
                where: {
                    id: orderId,
                    user: { id: userId },
                },
                relations: ['items', 'items.product'],
            });

            if (!order) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'Order not found or access denied',
                };
            }

            return {
                status: HttpStatus.OK,
                message: 'Order fetched successfully',
                data: order,
            };
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error fetching order',
                error: error.message,
            };
        }
    }

    async updateOrderStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<CommonResponse> {
        try {
            const order = await this.ordersRepository.findOne({ where: { id } });

            if (!order) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'Order not found',
                };
            }
            console.log('Received DTO:', updateOrderStatusDto);


            const newStatus = updateOrderStatusDto.status;

            if (!Object.values(OrderStatus).includes(newStatus)) {
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: `Invalid order status: ${newStatus}`,
                };
            }

            order.status = newStatus;
            const updatedOrder = await this.ordersRepository.save(order);

            return {
                status: HttpStatus.OK,
                message: 'Order status updated successfully',
                data: updatedOrder,
            };

        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error updating order status',
                error: error.message,
            };
        }

    }


    async removeOrder(id: string): Promise<CommonResponse> {
        const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const order = await queryRunner.manager.findOne(Order, {
                where: { id },
                relations: ['items', 'items.product'],
            });

            if (!order) {
                await queryRunner.rollbackTransaction();
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'Order not found',
                };
            }

            // Restore product quantities
            for (const item of order.items) {
                item.product.quantity += item.quantity;
                await queryRunner.manager.save(item.product);
            }

            // Delete order items explicitly
            await queryRunner.manager.delete(OrderItem, { order: { id } });

            // Delete the order itself
            await queryRunner.manager.delete(Order, id);

            await queryRunner.commitTransaction();

            return {
                status: HttpStatus.OK,
                message: 'Order removed successfully',
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error removing order',
                error: error.message,
            };
        } finally {
            await queryRunner.release();
        }
    }


}
