import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { UsersService } from '../users/users.service';
import { ProductsService } from '../products/products.service';
import { CommonResponse } from 'src/template/response';
import { create } from 'domain';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectRepository(Review)
        private reviewRepository: Repository<Review>,

        private usersService: UsersService,
        private productsService: ProductsService
    ) { }

    async addReview(userId: string, productId: string, createReviewDto: CreateReviewDto): Promise<CommonResponse> {
        try {
            const user = await this.usersService.findOneById(userId);
            if (!user) {
                throw new NotFoundException('User not found');
            }
            const productResponse = await this.productsService.findProductById(productId);
            if (!productResponse.data) {
                throw new NotFoundException('Product Not Found');
            }
            const product = productResponse.data;
            const review = this.reviewRepository.create({
                ...createReviewDto,
                user,
                product,
            });
            await this.reviewRepository.save(review);
            return {
                status: HttpStatus.OK,
                message: "review added successfully",
                data: review
            }

        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "Error During Adding the Review",
                error: error.message
            }
        }
    }

    async getReview(productId: string): Promise<CommonResponse> {
        try {
            const reviewData = await this.reviewRepository.find({
                where: { product: { id: productId } },
                relations: ['user', 'product'],
            })

            if (!reviewData) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: "Product review not found or invalid product id",
                }
            }

            const mappedReviews = reviewData.map(review => ({
                id: review.id,
                rating: review.rating,
                Comment: review.comment,
                user: { name: review.user?.name },
                product: review.product,
                createdAt: review.createdAt,
                updatedAt: review.updatedAt,
            }));

            return {
                status: HttpStatus.OK,
                message: "Revies fetched successfully",
                data: mappedReviews
            }


        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "Error During getting the review for the particular product",
                error: error.message
            }
        }
    }

}
