import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ResponseDto } from 'src/common/dto/response.dto';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepo: CategoryRepository,
    private readonly i18n: I18nService,
  ) {}

  // ── helpers ──────────────────────────────────────────────────────────────

  private buildSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async assertSlugFree(slug: string, excludeId?: string) {
    const existing = await this.categoryRepo.findBySlug(slug);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        this.i18n.t('category.slug_exists'),
        'CATEGORY_SLUG_EXISTS',
      );
    }
  }

  private async assertExists(id: string) {
    const cat = await this.categoryRepo.findById(id);
    if (!cat) {
      throw new NotFoundException(
        this.i18n.t('category.not_found'),
        'CATEGORY_NOT_FOUND',
      );
    }
    return cat;
  }

  // ── API 1 — POST /categories ──────────────────────────────────────────────

  async create(dto: CreateCategoryDto) {
    // auto-generate slug if not supplied
    const slug = dto.slug ?? this.buildSlug(dto.name);
    dto.slug = slug;

    await this.assertSlugFree(slug);

    // if parentId provided, make sure parent exists
    if (dto.parentId) {
      await this.assertExists(dto.parentId);
    }

    const category = await this.categoryRepo.create(dto);

    return ResponseDto.success(
      this.i18n.t('category.created_success'),
      category,
    );
  }

  // ── API 2 — GET /categories/tree ─────────────────────────────────────────

  async getTree() {
    const tree = await this.categoryRepo.findTree();
    return ResponseDto.success(this.i18n.t('category.retrieved_success'), tree);
  }

  // ── API 3 — GET /categories (admin flat list) ─────────────────────────────

  async findAll(search?: string) {
    const categories = await this.categoryRepo.findAll(search);
    return ResponseDto.success(
      this.i18n.t('category.all_retrieved_success'),
      categories,
    );
  }

  // ── API 4 — GET /categories/:id ───────────────────────────────────────────

  async findOne(id: string) {
    const category = await this.assertExists(id);
    return ResponseDto.success(
      this.i18n.t('category.retrieved_success'),
      category,
    );
  }

  // ── API 5 — GET /categories/:id/children ─────────────────────────────────

  async getChildren(parentId: string) {
    await this.assertExists(parentId);
    const children = await this.categoryRepo.findChildren(parentId);
    return ResponseDto.success(
      this.i18n.t('category.retrieved_success'),
      children,
    );
  }

  // ── API 6 — PATCH /categories/:id ────────────────────────────────────────

  async update(id: string, dto: UpdateCategoryDto) {
    await this.assertExists(id);

    if (dto.slug) {
      await this.assertSlugFree(dto.slug, id);
    } else if (dto.name) {
      dto.slug = this.buildSlug(dto.name);
      await this.assertSlugFree(dto.slug, id);
    }

    if (dto.parentId) {
      // prevent self-reference
      if (dto.parentId === id) {
        throw new ConflictException(
          this.i18n.t('category.self_parent'),
          'CATEGORY_SELF_PARENT',
        );
      }
      await this.assertExists(dto.parentId);
    }

    const updated = await this.categoryRepo.update(id, dto);
    return ResponseDto.success(
      this.i18n.t('category.updated_success'),
      updated,
    );
  }

  // ── API 7 — DELETE /categories/:id ───────────────────────────────────────

  async remove(id: string) {
    await this.assertExists(id);
    await this.categoryRepo.softDelete(id);
    return ResponseDto.success(this.i18n.t('category.deleted_success'));
  }
}
