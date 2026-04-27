import { Injectable } from '@nestjs/common';

@Injectable()
export class MetadataSchemaService {
  private schemas = [
    { name: 'user', fields: [] },
    { name: 'product', fields: [] },
  ];

  async findByName(name: string) {
    return this.schemas.find((schema) => schema.name === name);
  }
}