import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Category } from './category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CommonResponse } from '../template/response';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private productsRepository: Repository<Product>,
        @InjectRepository(Category)
        private categoriesRepository: Repository<Category>,
    ) { }

    async createProduct(id: string, createProductDto: CreateProductDto): Promise<CommonResponse> {
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

            const product = this.productsRepository.create({ ...rest, category });
            await this.productsRepository.save(product);
            return {
                status: HttpStatus.CREATED,
                message: "Product Created Successfully",
                data: product
            }
        } catch (error) {
            return{
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "error during creating new product",
                data: error.message
            }
         }

    }


    async findAllProducts(): Promise<Product[]> {
        return this.productsRepository.find({ relations: ['category'] });
    }

    async findProductById(id: string): Promise<Product> {
        const product = await this.productsRepository.findOne({
            where: { id },
            relations: ['category'],
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return product;
    }


    async updateProduct(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
        const product = await this.findProductById(id);
        const { categoryId, ...rest } = updateProductDto;
        if (categoryId) {
            const category = await this.categoriesRepository.findOne({
                where: { id: categoryId },
            });
            if (!category) {
                throw new NotFoundException('Category not found');
            }
            product.category = category;
        }
        Object.assign(product, rest);
        return this.productsRepository.save(product);
    }

    async removeProduct(id: string): Promise<void> {
        const product = await this.findProductById(id);
        await this.productsRepository.remove(product);
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

    async findAllCategories(): Promise<Category[]> {
        return this.categoriesRepository.find({ relations: ['products'] });
    }

    async findCategoryById(id: string): Promise<Category> {
        const category = await this.categoriesRepository.findOne({
            where: { id },
            relations: ['products'],
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return category;
    }
    async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
        const category = await this.findCategoryById(id);
        Object.assign(category, updateCategoryDto);
        return this.categoriesRepository.save(category);
    }

    async removeCategory(id: string): Promise<void> {
        const category = await this.findCategoryById(id);
        await this.categoriesRepository.remove(category);
    }
}