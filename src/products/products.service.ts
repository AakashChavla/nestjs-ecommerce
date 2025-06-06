import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { User } from '../users/entities/user.entity'
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CommonResponse } from '../template/response';
// import { instanceToPlain } from 'class-transformer';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private productsRepository: Repository<Product>,

        @InjectRepository(Category)
        private categoriesRepository: Repository<Category>,

    ) { }

    async createProduct(userId: string, createProductDto: CreateProductDto): Promise<CommonResponse> {
        try {
            const { categoryId, ...rest } = createProductDto;

            const category = await this.categoriesRepository.findOne({
                where: { id: categoryId },
            });

            if (!category) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: "category not found"
                }
            }

            const product = this.productsRepository.create({ ...createProductDto, userId });
            await this.productsRepository.save(product);
            // const user = await this.userRepository.findOne({
            //     where: { id: userId }
            // });


            // const responseData = instanceToPlain({
            //     ...createProductDto,
            //     category,
            //     user
            // });

            return {
                status: HttpStatus.CREATED,
                message: "Product Created Successfully",
                data: product
            }
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "error during creating new product",
                data: error.message
            }
        }

    }


    async findAllProducts(): Promise<CommonResponse> {
        try {
            const data = await this.productsRepository.find({ relations: ['category'] });
            if (!data) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: "product data not found",
                }
            }
            return {
                status: HttpStatus.OK,
                message: "product viewed successfull",
                data: data
            }
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "error during get all product",
                error: error.message
            }
        }

    }

    async findProductById(id: string): Promise<CommonResponse> {
        try {
            const product = await this.productsRepository.findOne({
                where: { id },
                relations: ['category'],
            });

            if (!product) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: "A Product with specific id not available"
                }
            }

            return {
                status: HttpStatus.OK,
                message: "product with id viewed Successfull",
                data: product,
            };
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "error during product with id",
                error: error.message
            };
        }

    }


    async updateProduct(userId: string, id: string, updateProductDto: UpdateProductDto): Promise<CommonResponse> {
        try {
            const product = await this.findProductById(id);
            const { categoryId, ...rest } = updateProductDto;
            if (userId !== product.data.userId) {
                return {
                    status: HttpStatus.UNAUTHORIZED,
                    message: "you have not added is product you are unauthorized"
                }
            }
            if (categoryId) {
                const category = await this.categoriesRepository.findOne({
                    where: { id: categoryId },
                });
                if (!category) {
                    return {
                        status: HttpStatus.NOT_FOUND,
                        message: "category not found"
                    }
                }
                product.data.category = category;
            }

            Object.assign(product.data, rest);
            const data = await this.productsRepository.save(product.data);
            return {
                status: HttpStatus.OK,
                message: "product updated successfull",
                data: data
            }
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "error product updated",
                error: error.message
            }
        }

    }

    async removeProduct(id: string): Promise<void> {
        const product = await this.findProductById(id);
        await this.productsRepository.remove(product.data);
    }

    async createCategory(createCategoryDto: CreateCategoryDto): Promise<CommonResponse> {
        try {
            // Capitalize each word directly inline
            createCategoryDto.name = createCategoryDto.name
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');

            const existingCategory = await this.categoriesRepository.findOne({
                where: { name: createCategoryDto.name },
            });

            if (existingCategory) {
                return {
                    status: HttpStatus.CONFLICT,
                    message: 'Category already exists',
                };
            }

            const category = this.categoriesRepository.create(createCategoryDto);
            await this.categoriesRepository.save(category);

            return {
                status: HttpStatus.CREATED,
                message: 'Category created successfully',
                data: category,
            };
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Error during creating the categories',
                data: error,
            };
        }
    }

    async findAllCategories(): Promise<CommonResponse> {
        try {
            const productsCategoryVise = await this.categoriesRepository.find({ relations: ['products'] });
            if (!productsCategoryVise) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: "No categories found",
                };
            }
            return {
                status: HttpStatus.OK,
                message: "Categories viewed successfully",
                data: productsCategoryVise,
            }
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "Error during fetching categories",
                error: error.message,
            };
        }
    }

    async findCategoryById(id: string): Promise<CommonResponse> {
        try {

            const category = await this.categoriesRepository.findOne({
                where: { id },
                relations: ['products'],
            });

            if (!category) {
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: "Category with this id not found",
                }
            }

            return {
                status: HttpStatus.OK,
                message: "Category with id viewed successfully",
                data: category,
            };
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "Error during fetching category by id",
                error: error.message,
            };
        }
    }
    async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CommonResponse> {
        try {
            const categoryResponse = await this.findCategoryById(id);
            const category = categoryResponse.data;
            Object.assign(category, updateCategoryDto);
            const data = await this.categoriesRepository.save(category);
            return {
                status: HttpStatus.OK,
                message: "Category updated successfully",
                data: data,
            };

        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "Error during updating category",
                error: error.message,
            };
        }
    }

    async removeCategory(id: string): Promise<CommonResponse> {
        try {

            const categoryResponse = await this.findCategoryById(id);
            const category = categoryResponse.data;
            const deletedCategories = await this.categoriesRepository.remove(category);
            return {
                status: HttpStatus.OK,
                message: "Category deleted successfully",
                data: deletedCategories,
            }
        } catch (error) {
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "Error during deleting category",
                error: error.message,
            };
        }
    }
}