import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { createTypeOrmOptions } from './database-options';

config({ path: '.env.local' });
config();
config({ path: '../../.env.local' });
config({ path: '../../.env' });

const configService = new ConfigService(process.env);
const dataSourceOptions = createTypeOrmOptions(configService);

export default new DataSource(dataSourceOptions);
