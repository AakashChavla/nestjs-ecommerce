import { Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { DatabaseService } from 'src/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

const LIST_INCLUDE = {
  images: {
    where: { isPrimary: true },
    select: { id: true, s3Key: true, altText: true },
  },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
} as const;

const DETAIL_INCLUDE = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  category: {
    include: { parent: { select: { id: true, name: true, slug: true } } },
  },
  tags: { include: { tag: true } },
  attributes: { include: { attribute: true } },
  variants: {
    where: { isActive: true },
    include: { attributes: { include: { attribute: true } }, inventory: true },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

@Injectable()
export class ProductRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto, sellerId: string, slug: string) {
    return this.databaseService.product.create({
      data: {
        sellerId,
        categoryId: dto.categoryId,
        name: dto.name,
        slug,
        description: dto.description,
        brand: dto.brand,
        mrp: dto.mrp,
        sellingPrice: dto.sellingPrice,
        discountPercent: dto.discountPercent ?? 0,
        currency: dto.currency ?? 'INR',
        status: dto.status ?? ProductStatus.DRAFT,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        ...(dto.attributes?.length
          ? {
              attributes: {
                create: dto.attributes.map((attr) => ({
                  attributeId: attr.attributeId,
                  value: attr.value,
                })),
              },
            }
          : {}),
        ...(dto.tagIds?.length
          ? {
              tags: {
                create: dto.tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
      include: DETAIL_INCLUDE,
    });
  }

  // ── Read — list ──────────────────────────────────────────────────────────

  async findMany(filters: ProductFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy,
      sortOrder = 'DESC',
      categoryId,
      sellerId,
      status,
      minPrice,
      maxPrice,
      brand,
      isFeatured,
      isActive,
      tagIds,
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (status) {
      where.status = status;
    }

    if (brand) {
      where.brand = { contains: brand, mode: Prisma.QueryMode.insensitive };
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (tagIds?.length) {
      where.tags = { some: { tagId: { in: tagIds } } };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (minPrice !== undefined) {
        priceFilter.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        priceFilter.lte = maxPrice;
      }
      where.sellingPrice = priceFilter;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { brand: { contains: search, mode: Prisma.QueryMode.insensitive } },
        {
          description: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];
    }

    const allowedSortFields = [
      'createdAt',
      'sellingPrice',
      'avgRating',
      'name',
    ];
    const orderByField = allowedSortFields.includes(sortBy ?? '')
      ? (sortBy as keyof Prisma.ProductOrderByWithRelationInput)
      : 'createdAt';

    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [orderByField]: sortOrder.toLowerCase(),
    };

    const [data, totalItems] = await this.databaseService.$transaction([
      this.databaseService.product.findMany({
        where,
        include: LIST_INCLUDE,
        skip,
        take: limit,
        orderBy,
      }),
      this.databaseService.product.count({ where }),
    ]);

    return { data, totalItems };
  }

  // ── Read — single ────────────────────────────────────────────────────────

  async findById(id: string) {
    return this.databaseService.product.findFirst({
      where: { id, deletedAt: null },
      include: DETAIL_INCLUDE,
    });
  }

  async findBySlug(slug: string) {
    return this.databaseService.product.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, slug: true },
    });
  }

  // ── Update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateProductDto, newSlug?: string) {
    const attributeUpserts = dto.attributes?.map((attr) => ({
      where: {
        productId_attributeId: { productId: id, attributeId: attr.attributeId },
      },
      update: { value: attr.value },
      create: { attributeId: attr.attributeId, value: attr.value },
    }));

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (newSlug) {
      data.slug = newSlug;
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (dto.brand !== undefined) {
      data.brand = dto.brand;
    }

    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }

    if (dto.mrp !== undefined) {
      data.mrp = dto.mrp;
    }

    if (dto.sellingPrice !== undefined) {
      data.sellingPrice = dto.sellingPrice;
    }

    if (dto.discountPercent !== undefined) {
      data.discountPercent = dto.discountPercent;
    }

    if (dto.currency !== undefined) {
      data.currency = dto.currency;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.isFeatured !== undefined) {
      data.isFeatured = dto.isFeatured;
    }

    if (attributeUpserts?.length) {
      data.attributes = { upsert: attributeUpserts };
    }

    if (dto.tagIds !== undefined) {
      data.tags = {
        deleteMany: {},
        create: dto.tagIds.map((tagId) => ({ tagId })),
      };
    }

    return this.databaseService.product.update({
      where: { id },
      data,
      include: DETAIL_INCLUDE,
    });
  }

  async softDelete(id: string) {
    return this.databaseService.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        status: ProductStatus.INACTIVE,
      },
    });
  }

  // ── Images ───────────────────────────────────────────────────────────────

  async addImage(
    productId: string,
    s3Key: string,
    altText?: string,
    isPrimary?: boolean,
  ) {
    return this.databaseService.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.productImage.updateMany({
          where: { productId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.productImage.create({
        data: {
          productId,
          s3Key,
          altText,
          isPrimary: isPrimary ?? false,
        },
      });
    });
  }

  async findImage(imageId: string) {
    return this.databaseService.productImage.findFirst({
      where: { id: imageId },
    });
  }

  async deleteImage(imageId: string) {
    return this.databaseService.productImage.delete({ where: { id: imageId } });
  }

  // ── Variants ──────────────────────────────────────────────────────────────

  async addVariant(productId: string, dto: UpdateVariantDto) {
    return this.databaseService.productVariant.create({
      data: {
        productId,
        sku: dto.sku!,
        name: dto.name!,
        priceOverride: dto.priceOverride ?? null,
        isActive: dto.isActive ?? true,
        ...(dto.attributes?.length
          ? {
              attributes: {
                create: dto.attributes.map((attr) => ({
                  attributeId: attr.attributeId!,
                  value: attr.value!,
                })),
              },
            }
          : {}),
      },
      include: {
        attributes: { include: { attribute: true } },
        inventory: true,
      },
    });
  }

  async findVariant(variantId: string) {
    return this.databaseService.productVariant.findFirst({
      where: { id: variantId },
      include: { product: { select: { sellerId: true } } },
    });
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto) {
    const attributeUpserts = dto.attributes?.map((attr) => ({
      where: {
        variantId_attributeId: {
          variantId,
          attributeId: attr.attributeId!,
        },
      },
      update: { value: attr.value! },
      create: { attributeId: attr.attributeId!, value: attr.value! },
    }));

    return this.databaseService.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.priceOverride !== undefined && {
          priceOverride: dto.priceOverride,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(attributeUpserts?.length
          ? { attributes: { upsert: attributeUpserts } }
          : {}),
      },
      include: {
        attributes: { include: { attribute: true } },
        inventory: true,
      },
    });
  }

  // ── Rating ───────────────────────────────────────────────────────────────

  async recalcRating(productId: string) {
    type ProductReviewAggregate = {
      _avg: { rating: number | null };
      _count: { rating: number };
    };

    type ProductReviewClient = {
      aggregate: (args: {
        where: { productId: string; deletedAt: null };
        _avg: { rating: true };
        _count: { rating: true };
      }) => Promise<ProductReviewAggregate>;
    };

    const reviewClient = (
      this.databaseService as unknown as { productReview: ProductReviewClient }
    ).productReview;

    const aggregate = await reviewClient.aggregate({
      where: { productId, deletedAt: null },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const avgRating = aggregate._avg.rating ?? 0;
    const reviewCount = aggregate._count.rating ?? 0;

    return this.databaseService.product.update({
      where: { id: productId },
      data: { avgRating, reviewCount },
    });
  }
}
