// OpenAPI-спека. Пути (/hello, /support, /orders) описаны вручную — их всего
// три, и они не выводятся автоматически без смены механизма роутинга. Но
// СХЕМЫ данных генерируются из реального кода, а не дублируются руками:
//   - SupportRequest — из декораторов class-validator на SupportRequestDto
//     (class-validator-jsonschema читает те же @IsInt/@MinLength/... что и
//     реальная валидация запроса в support.controller.ts).
//   - Остальные схемы — из TypeScript-типов через ts-json-schema-generator
//     (читает .ts файлы напрямую, декораторы не нужны).
// При изменении DTO схемы в Swagger обновятся сами при следующем запуске.
import path from 'node:path';
import { targetConstructorToSchema } from 'class-validator-jsonschema';
import { createGenerator } from 'ts-json-schema-generator';
import type { SchemaObject } from 'openapi3-ts';
import { SupportRequestDto } from './api/support/dto/supportRequest.dto';

const SRC_DIR = __dirname;
const TSCONFIG_PATH = path.join(SRC_DIR, '..', 'tsconfig.json');

function generateTsSchema(
  relativeFilePath: string,
  typeName: string,
): { root: SchemaObject; definitions: Record<string, SchemaObject> } {
  const schema = createGenerator({
    path: path.join(SRC_DIR, relativeFilePath),
    tsconfig: TSCONFIG_PATH,
    type: typeName,
    expose: 'export',
  }).createSchema(typeName);

  const { definitions = {}, $schema, $ref, ...rest } = schema as Record<string, unknown>;
  // Когда схема не сводится к единственному $ref (например, корневой тип сам
  // примитив), rest уже содержит нужные поля — на практике для наших DTO
  // (классов/интерфейсов) всегда приходит $ref на definitions[typeName].
  const root = (definitions as Record<string, SchemaObject>)[typeName] ?? (rest as SchemaObject);

  return { root, definitions: definitions as Record<string, SchemaObject> };
}

// JSON Schema (ts-json-schema-generator) использует "#/definitions/X",
// OpenAPI — "#/components/schemas/X". Приводим рекурсивно.
function retargetRefs<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(retargetRefs) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key === '$ref' && typeof val === 'string') {
        result[key] = val.replace('#/definitions/', '#/components/schemas/');
      } else {
        result[key] = retargetRefs(val);
      }
    }
    return result as T;
  }
  return value;
}

const supportRequestSchema = targetConstructorToSchema(SupportRequestDto) as SchemaObject;

const supportResponse = generateTsSchema('api/support/dto/supportResponse.dto.ts', 'SupportResponseDto');
const orderResponse = generateTsSchema('api/order/dto/orderResponse.dto.ts', 'OrderResponseDto');

const generatedSchemas = retargetRefs({
  SupportRequestDto: supportRequestSchema,
  ...supportResponse.definitions,
  ...orderResponse.definitions,
});

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'AI Support Assistant — Backend API',
    version: '1.0.0',
    description:
      'Backend для AI-ассистента поддержки маркетплейса. Принимает сообщения пользователя, классифицирует намерение, отвечает из базы знаний или просит уточнить заказ/передаёт оператору.\n\nСхемы запросов/ответов сгенерированы из исходного кода (DTO) — см. src/openapi.ts.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'health', description: 'Проверка доступности сервиса' },
    { name: 'support', description: 'Диалог с AI-ассистентом' },
    { name: 'orders', description: 'Заказы пользователя' },
  ],
  paths: {
    '/hello': {
      get: {
        tags: ['health'],
        summary: 'Проверка, что сервис запущен',
        responses: {
          '200': {
            description: 'Сервис работает',
            content: { 'text/plain': { schema: { type: 'string', example: 'hello!' } } },
          },
        },
      },
    },
    '/support': {
      post: {
        tags: ['support'],
        summary: 'Отправить сообщение AI-ассистенту',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SupportRequestDto' },
              examples: {
                default: {
                  value: { userId: 7, sessionId: 1001, message: 'Where is my order?' },
                },
                withOrderId: {
                  value: {
                    userId: 7,
                    sessionId: 1001,
                    message: 'Where is my order?',
                    orderId: 3,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Ответ ассистента',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SupportResponseDto' } },
            },
          },
          '400': {
            description: 'Ошибка валидации входных данных',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } },
            },
          },
          '500': {
            description:
              'Внутренняя ошибка (включая недоступность или ошибку ML-сервиса — backend не различает их структурированно, см. README фронтенда)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GenericError' } },
            },
          },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['orders'],
        summary: 'Получить заказы пользователя',
        parameters: [
          {
            name: 'userId',
            in: 'query',
            required: true,
            schema: { type: 'integer', minimum: 1 },
            description: 'Положительное целое число',
          },
        ],
        responses: {
          '200': {
            description: 'Список заказов пользователя (может быть пустым)',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/OrderResponseDto' } },
              },
            },
          },
          '400': {
            description: 'userId не передан или не является положительным целым числом',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GenericError' } },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ...generatedSchemas,
      // Эти две формы задаёт не DTO, а сами error-handler'ы
      // (support.controller.ts / index.ts) — писать руками безопасно, так
      // как их "контракт" — это библиотека class-validator и обычный
      // `{ error: string }`, а не наш TS-тип.
      ValidationError: {
        type: 'object',
        properties: {
          errors: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Карта constraint → текст ошибки (class-validator)',
            },
          },
        },
        example: {
          errors: [{ minLength: 'message must be longer than or equal to 3 characters' }],
        },
      },
      GenericError: {
        type: 'object',
        properties: { error: { type: 'string' } },
        example: { error: 'A positive integer userId is required.' },
      },
    },
  },
};
