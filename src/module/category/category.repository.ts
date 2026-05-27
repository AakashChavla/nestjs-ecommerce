import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── Create ───────────────────────────────────────────────────────────────

  async create(dto: CreateCategoryDto, slug: string) {
    return this.databaseService.category.create({
      data: {
        name: dto.name,
        slug,
        iconUrl: dto.iconUrl,
        isActive: dto.isActive ?? true,
        ...(dto.parentId ? { parent: { connect: { id: dto.parentId } } } : {}),
      },
      include: { parent: true },
    });
  }

  // ── Read — full tree (root categories with one level of children) ─────────

  async findTree() {
    return this.databaseService.category.findMany({
      where: { parentId: null, deletedAt: null, isActive: true },
      include: {
        children: {
          where: { deletedAt: null, isActive: true },
          include: {
            children: {
              where: { deletedAt: null, isActive: true },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── Read — flat list for admin (includes inactive) ────────────────────────

  async findAll(search?: string) {
    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(search
        ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
        : {}),
    };
    return this.databaseService.category.findMany({
      where,
      include: { parent: { select: { id: true, name: true, slug: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // ── Read — single by id ───────────────────────────────────────────────────

  async findById(id: string) {
    return this.databaseService.category.findFirst({
      where: { id, deletedAt: null },
      include: {
        parent: true,
        children: {
          where: { deletedAt: null, isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  // ── Read — single by slug ─────────────────────────────────────────────────

  async findBySlug(slug: string) {
    return this.databaseService.category.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  // ── Read — direct children of a category ─────────────────────────────────

  async findChildren(parentId: string) {
    return this.databaseService.category.findMany({
      where: { parentId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateCategoryDto) {
    return this.databaseService.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        // change parent or clear it (set parentId = null for root)
        ...(dto.parentId !== undefined && {
          parent: dto.parentId
            ? { connect: { id: dto.parentId } }
            : { disconnect: true },
        }),
      },
      include: { parent: true, children: true },
    });
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  async softDelete(id: string) {
    return this.databaseService.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
