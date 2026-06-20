import * as Joi from 'joi';

const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  FRONTEND_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
  API_PUBLIC_URL: Joi.string().uri().default('http://localhost:3001/api'),
  JWT_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(16).default('signa-development-secret'),
  }),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().default('postgres'),
  DATABASE_PASSWORD: Joi.string().allow('').default('postgres'),
  DATABASE_NAME: Joi.string().default('signa_development'),
  DATABASE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  DATABASE_LOGGING: Joi.boolean().truthy('true').falsy('false').default(false),

  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .allow('')
    .optional(),
  CACHE_NAMESPACE: Joi.string().default('signa-cache'),
  CACHE_TTL_MS: Joi.number().integer().min(0).default(3_600_000),

  STORAGE_PATH: Joi.string().default('storage'),
  PDF_PREVIEW_MAX_PAGES: Joi.number().integer().min(1).default(15),
  PDF_PREVIEW_MAX_WIDTH: Joi.number().integer().min(300).default(1400),
  HEALTH_HEAP_LIMIT_MB: Joi.number().integer().min(64).default(512),
  HEALTH_REDIS_REQUIRED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  HEALTH_REDIS_TIMEOUT_MS: Joi.number().integer().min(100).default(1000),
  API_HEALTH_WINDOW_MS: Joi.number().integer().min(60_000).default(300_000),
  API_SLOW_REQUEST_WARN_MS: Joi.number().integer().min(1).default(1000),
  API_HEALTH_P95_DEGRADED_MS: Joi.number().integer().min(1).default(1000),
  API_HEALTH_ERROR_RATE_DEGRADED_PERCENT: Joi.number()
    .min(0)
    .max(100)
    .default(5),
  API_HEALTH_MIN_REQUEST_COUNT: Joi.number().integer().min(1).default(20),

  THROTTLE_TTL_MS: Joi.number().integer().min(1_000).default(60_000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(120),
});

export default validationSchema;
