import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { ProductsService } from 'src/products/products.service';
import { CommonResponse } from 'src/template/response';

@Injectable()
export class WishlistService {
    constructor(
        @InjectRepository(Wishlist)
        private wishlistRepository: Repository<Wishlist>,

        private usersService: UsersService,
        private productsService: ProductsService
    ) { }

    async addToWishlist(userId: string, productId: string): Promise<CommonResponse> {
        try {
            const user = await this.usersService.findOneById(userId);
            if (!user) {
                throw new NotFoundException("User Not Found");
            }

            const productResponce = await this.productsService.findProductById(productId);
            const product = productResponce.data;
            if (!product) {
                throw new NotFoundException('Product Not Found');
            }
            const existing = await this.wishlistRepository.findOne({
                where: { user: { id: userId }, product: { id: productId } },
            });

            if (existing) {
                return {
                    status: HttpStatus.CONFLICT,
                    message: 'Product already exists in your wishlist',
                };
            }

            const wishlistItem =  this.wishlistRepository.create({ user, product });
            const data = await this.wishlistRepository.save(wishlistItem);
            return {
                status: HttpStatus.OK,
                message: 'Product added in your wishlist successfully',
            }
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error During Adding Product In Wishlist',
                error: error.message
            }
        }
    }

    async removeFromWishList(userId: string, productId: string): Promise<CommonResponse> {
        try {
            const wishlistItem = await this.wishlistRepository.findOne({
                where: {
                    user: { id: userId },
                    product: { id: productId }
                }
            });

            if (!wishlistItem) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'Wishlist item not found for this product'
                };
            }

            await this.wishlistRepository.remove(wishlistItem);

            return {
                status: HttpStatus.OK,
                message: 'Wishlist item removed Successfully'
            }

        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "Error During Removing Item from Wishlist",
                error: error.message
            }
        }
    }

    async getWishlist(userId: string){
        try{
            const wishlistItem = await this.wishlistRepository.find({
                where: {
                    user: {id: userId}
                },
                relations: ['product'],
            })

            if(wishlistItem.length === 0){
                return{
                    status : HttpStatus.NOT_FOUND,
                    message: "Wishlist not found for user"
                }
            }

            return{
                status: HttpStatus.OK,
                message: "Wishlist got successfully",
                data : wishlistItem
            }
        }catch(error){
            return{
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "error during gettin wish list",
                error : error.message
            }
        }
    }
}
