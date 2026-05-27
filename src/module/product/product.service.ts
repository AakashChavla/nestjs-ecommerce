import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';
import { buildS3Folder, S3_FOLDERS, S3AwsService } from 'src/common/config';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from 'src/common/dto/paginated-response.dto';
import { BusinessException, NotFoundException } from 'src/common/exceptions';
import {
  generateProductSlug,
  generateUniqueSlug,
} from 'src/common/helpers/slug.util';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { CategoryRepository } from '../category/category.repository';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ProductFilterDto } from './dto/product-filter.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductRepository } from './product.repository';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly i18n: I18nService,
    private readonly s3: S3AwsService,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────────────────

  private buildMeta(
    pagination: ProductFilterDto,
    totalItems: number,
    itemsOnCurrentPage: number,
  ): PaginationMetaDto {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      page,
      limit,
      totalItems,
      totalPages,
      itemsOnCurrentPage,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  private assertOwnership(
    product: { sellerId: string },
    user: AuthenticatedUser,
  ) {
    if (user.role !== UserRole.ADMIN && product.sellerId !== user.userId) {
      throw new BusinessException(
        this.i18n.t('product.not_owner'),
        'PRODUCT_NOT_OWNER',
      );
    }
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) {
      throw new NotFoundException(
        this.i18n.t('product.category_not_found'),
        'CATEGORY_NOT_FOUND',
      );
    }
  }

  // ── API — Create ─────────────────────────────────────────────────────────

  async create(dto: CreateProductDto, sellerId: string) {
    await this.assertCategoryExists(dto.categoryId);

    if (dto.sellingPrice > dto.mrp) {
      throw new BusinessException(
        this.i18n.t('product.price_exceeds_mrp'),
        'PRICE_EXCEEDS_MRP',
      );
    }

    const slug = await generateUniqueSlug(
      generateProductSlug(dto.name),
      (candidate) => this.productRepo.findBySlug(candidate),
    );

    const product = await this.productRepo.create(dto, sellerId, slug);

    return {
      message: this.i18n.t('product.created_success'),
      data: product,
    };
  }

  // ── API — List ───────────────────────────────────────────────────────────

  async findAll(filters: ProductFilterDto) {
    const { data, totalItems } = await this.productRepo.findMany(filters);
    const meta = this.buildMeta(filters, totalItems, data.length);
    return new PaginatedResponseDto(data, meta);
  }

  // ── API — Get One ────────────────────────────────────────────────────────

  async findOne(id: string) {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundException(
        this.i18n.t('product.not_found'),
        'PRODUCT_NOT_FOUND',
      );
    }

    return {
      message: this.i18n.t('product.retrieved_success'),
      data: product,
    };
  }

  // ── API — Update ─────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateProductDto, user: AuthenticatedUser) {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundException(
        this.i18n.t('product.not_found'),
        'PRODUCT_NOT_FOUND',
      );
    }

    this.assertOwnership(product, user);

    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    const mrp = dto.mrp ?? product.mrp;
    const sellingPrice = dto.sellingPrice ?? product.sellingPrice;
    if (sellingPrice > mrp) {
      throw new BusinessException(
        this.i18n.t('product.price_exceeds_mrp'),
        'PRICE_EXCEEDS_MRP',
      );
    }

    let newSlug: string | undefined;
    if (dto.name && dto.name !== product.name) {
      newSlug = await generateUniqueSlug(
        generateProductSlug(dto.name),
        (candidate) => this.productRepo.findBySlug(candidate),
        id,
      );
    }

    const updated = await this.productRepo.update(id, dto, newSlug);
    return {
      message: this.i18n.t('product.updated_success'),
      data: updated,
    };
  }

  // ── API — Delete ─────────────────────────────────────────────────────────

  async remove(id: string, user: AuthenticatedUser) {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundException(
        this.i18n.t('product.not_found'),
        'PRODUCT_NOT_FOUND',
      );
    }

    this.assertOwnership(product, user);

    await this.productRepo.softDelete(id);
    return {
      message: this.i18n.t('product.deleted_success'),
    };
  }

  // ── API — Images ─────────────────────────────────────────────────────────

  async uploadImage(
    productId: string,
    file: Express.Multer.File,
    user: AuthenticatedUser,
    isPrimary?: boolean,
  ) {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException(
        this.i18n.t('product.not_found'),
        'PRODUCT_NOT_FOUND',
      );
    }

    this.assertOwnership(product, user);

    const folder = buildS3Folder(
      S3_FOLDERS.PRODUCT_IMAGE,
      'productId',
      productId,
    );
    const result = await this.s3.upload(folder, file);
    const image = await this.productRepo.addImage(
      productId,
      result.key,
      file.originalname,
      isPrimary,
    );
    const { url } = await this.s3.getPresignedUrl(result.key);

    return {
      message: this.i18n.t('product.image_uploaded_success'),
      data: { image, url },
    };
  }

  async deleteImage(
    productId: string,
    imageId: string,
    user: AuthenticatedUser,
  ) {
    const image = await this.productRepo.findImage(imageId);
    if (image?.productId !== productId) {
      throw new NotFoundException(
        this.i18n.t('product.image_not_found'),
        'PRODUCT_IMAGE_NOT_FOUND',
      );
    }

    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException(
        this.i18n.t('product.not_found'),
        'PRODUCT_NOT_FOUND',
      );
    }

    this.assertOwnership(product, user);

    await this.s3.delete(image.s3Key);
    await this.productRepo.deleteImage(imageId);

    return {
      message: this.i18n.t('product.image_deleted_success'),
    };
  }

  // ── API — Variants ───────────────────────────────────────────────────────

  async addVariant(
    productId: string,
    dto: UpdateVariantDto,
    user: AuthenticatedUser,
  ) {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException(
        this.i18n.t('product.not_found'),
        'PRODUCT_NOT_FOUND',
      );
    }

    this.assertOwnership(product, user);

    const variant = await this.productRepo.addVariant(productId, dto);

    return {
      message: this.i18n.t('product.variant_added_success'),
      data: variant,
    };
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
    user: AuthenticatedUser,
  ) {
    const variant = await this.productRepo.findVariant(variantId);
    if (variant?.productId !== productId) {
      throw new NotFoundException(
        this.i18n.t('product.variant_not_found'),
        'PRODUCT_VARIANT_NOT_FOUND',
      );
    }

    this.assertOwnership(variant.product, user);

    const updated = await this.productRepo.updateVariant(variantId, dto);

    return {
      message: this.i18n.t('product.variant_updated_success'),
      data: updated,
    };
  }
}
