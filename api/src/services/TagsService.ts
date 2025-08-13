import { Database } from '../database';
import { Tag, CreateTagRequest } from '../models';

export class TagsService {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async getAllTagsAsync(): Promise<Tag[]> {
    return this.database.getAllTags();
  }

  async getTagByIdAsync(id: number): Promise<Tag | null> {
    return this.database.getTagById(id);
  }

  async createTagAsync(request: CreateTagRequest): Promise<Tag> {
    return this.database.createTag(request.name);
  }

  async deleteTagAsync(id: number): Promise<boolean> {
    return this.database.deleteTag(id);
  }
}