// 重新导出entities模块中的功能，保持向后兼容
export {
  type Entity,
  type CreateEntityDto,
  type UpdateEntityDto,
  listEntities,
  createEntity,
  getEntityById,
  updateEntity,
  deleteEntity,
  type Tag,
  type CreateTagDto,
  type UpdateTagDto,
  listTags,
  createTag,
  getTagById,
  updateTag,
  deleteTag
} from "./entities";