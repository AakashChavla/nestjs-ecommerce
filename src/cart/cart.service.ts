import { HttpStatus, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cartItem.entity';
import { UsersService } from 'src/users/users.service';
import { ProductsService } from 'src/products/products.service';
import { InjectRepository } from '@nestjs/typeorm';
import { CommonResponse } from 'src/template/response';
import { CreateCartItemDto } from './dto/createCartItem.dto';
import { UpdateCartItemDto } from './dto/updateCartItem.dto';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class CartService {
    constructor(
        @InjectRepository(Cart)
        private cartRepository: Repository<Cart>,

        @InjectRepository(CartItem)
        private cartItemRepository: Repository<CartItem>,

        private usersService: UsersService,
        private productsService: ProductsService,
        private orderService: OrdersService

    ) { }

    async findOrCreateCart(userId: string): Promise<CommonResponse> {
        try {
            let cart = await this.cartRepository.findOne({
                where: { user: { id: userId } },
                relations: ['items', 'items.product'],
            });

            if (!cart) {
                const user = await this.usersService.findOneById(userId);
                if (!user) {
                    return {
                        status: HttpStatus.NOT_FOUND,
                        message: 'User not found.',
                    };
                }

                cart = await this.cartRepository.save(
                    this.cartRepository.create({ user, items: [] })
                );
            }

            return {
                status: HttpStatus.OK,
                message: 'Cart found or created successfully.',
                data: cart,
            };
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'An error occurred while finding or creating the cart.',
                error: error.message,
            };
        }
    }


    async addItem(
        userId: string,
        createCartItemDto: CreateCartItemDto
    ): Promise<CommonResponse> {
        try {
            const cartResponse = await this.findOrCreateCart(userId);
            const cart = cartResponse.data;
            const { productId, quantity } = createCartItemDto;
            const productResponse = await this.productsService.findProductById(productId);
            const product = productResponse.data;
            if (!product) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'Product not found.',
                };
            }
            let cartItem = cart.items.find(item => item.product.id === productId);
            if (cartItem) {
                // If the item already exists in the cart, update the quantity
                cartItem.quantity += quantity;
            }
            else {
                // If the item does not exist, create a new cart item
                cartItem = this.cartItemRepository.create({
                    product,
                    quantity,
                    cart,
                    unitPrice: product.price,
                });
                cart.items.push(cartItem);
            }
            const cartData = await this.cartItemRepository.save(cartItem);

            return {
                status: HttpStatus.CREATED,
                message: 'Item added to cart successfully.',
                data: cartData,
            }

        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'An error occurred while adding the item to the cart.',
                error: error.message,
            };
        }
    }

    async updateCart(
        userId: string,
        cartItemId: string,
        updateCartItemDto: UpdateCartItemDto
    ): Promise<CommonResponse> {
        try {
            const { quantity } = updateCartItemDto;
            const cartResponse = await this.findOrCreateCart(userId);
            const cart = cartResponse.data;

            const cartItem = cart.items.find(item => item.id === cartItemId);

            if (!cartItem) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'Cart item not found.',
                };
            }

            const availableQty = cartItem.product.quantity;
            if (quantity > availableQty) {
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: `Cannot add more than ${availableQty} units.`,
                };
            }

            cartItem.quantity = quantity;
            const updated = await this.cartItemRepository.save(cartItem);

            return {
                status: HttpStatus.OK,
                message: 'Cart item updated successfully.',
                data: updated,
            };
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'An error occurred while updating the cart.',
                error: error.message,
            };
        }
    }


    async removeItem(
        userId: string,
        cartItemId: string
    ): Promise<CommonResponse> {
        try {
            const cartResponse = await this.findOrCreateCart(userId);
            const cart = cartResponse.data;

            const cartItem = cart.items.find(item => item.id === cartItemId);

            if (!cartItem) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'Cart item not found.',
                };
            }

            // Remove the item directly from the database
            await this.cartItemRepository.delete(cartItemId);

            return {
                status: HttpStatus.OK,
                message: 'Cart item removed successfully.',
            };
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'An error occurred while removing the item from the cart.',
                error: error.message,
            };
        }
    }

    async getCartSummary(userId: string): Promise<CommonResponse> {
        try {
            const cartResponse = await this.findOrCreateCart(userId);
            const cart = cartResponse.data;

            if (!cart || !cart.items.length) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'Cart is empty.',
                };
            }

            return {
                status: HttpStatus.OK,
                message: 'Cart summary retrieved successfully.',
                data: cart,
            };
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'An error occurred while retrieving the cart summary.',
                error: error.message,
            };
        }
    }

    async checkout(userId: string): Promise<CommonResponse> {
        try {
            // Step 1: Get the user's cart
            const cartResponse = await this.findOrCreateCart(userId);
            const cart = cartResponse.data;

            if (!cart || cart.items.length === 0) {
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Cart is empty.',
                };
            }

            // Step 2: Prepare CreateOrderDto from cart items
            const items = cart.items.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
            }));

            const createOrderDto = { userId, items };

            // Step 3: Call the existing createOrder service
            const orderResponse = await this.orderService.createOrder(createOrderDto);

            if (orderResponse.status !== HttpStatus.CREATED) {
                return orderResponse; // propagate error
            }

            // Step 4: Clear the cart ONLY AFTER successful order
            const cartItemIds = cart.items.map(item => item.id);
            await this.cartItemRepository.delete(cartItemIds);

            return {
                status: HttpStatus.OK,
                message: 'Checkout successful. Order placed and cart cleared.',
                data: orderResponse.data,
            };
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Checkout failed.',
                error: error.message,
            };
        }
    }


}
