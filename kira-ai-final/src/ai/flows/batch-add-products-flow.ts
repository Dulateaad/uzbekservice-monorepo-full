'use server';

/**
 * @fileOverview AI-агент, который обрабатывает пакетное добавление продуктов из структурированных данных.
 *
 * - batchAddProducts - функция, которая принимает массив данных о продуктах и возвращает их в виде, готовом для добавления в Firestore.
 * - BatchAddProductsInput - тип входных данных для функции.
 * - BatchAddProductsOutput - тип возвращаемого значения.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Схема для одного продукта во входном массиве
const ProductInputSchema = z.object({
  name: z.string().describe('Название продукта.'),
  description: z.string().optional().describe('Описание продукта. Если отсутствует, AI должен его сгенерировать.'),
  price: z.string().describe('Цена продукта в виде строки.'),
  category: z.string().optional().describe('Категория продукта. Если отсутствует, AI должен ее определить.'),
  sizes: z.string().describe('Размеры, доступные для продукта, перечисленные через запятую (например, "S,M,L").'),
  imageUrls: z.string().describe('URL-адреса изображений продукта, перечисленные через запятую.'),
});

const BatchAddProductsInputSchema = z.object({
  products: z.array(ProductInputSchema).describe('Массив объектов продуктов для добавления.'),
});
export type BatchAddProductsInput = z.infer<typeof BatchAddProductsInputSchema>;

// Схема для одного продукта на выходе
const ProductOutputSchema = z.object({
  name: z.string(),
  description: z.string().describe('Полное и привлекательное описание продукта.'),
  price: z.number().describe('Цена продукта как число.'),
  category: z.string().describe('Категория продукта.'),
  sizes: z.array(z.string()).describe('Массив доступных размеров.'),
  imageUrls: z.array(z.string().url()).describe('Массив URL-адресов изображений.'),
  colors: z.array(z.string()).default([]).describe('Массив цветов. Пока не используется, возвращать пустым.'),
});

const BatchAddProductsOutputSchema = z.object({
  processedProducts: z.array(ProductOutputSchema),
});
export type BatchAddProductsOutput = z.infer<typeof BatchAddProductsOutputSchema>;

export async function batchAddProducts(input: BatchAddProductsInput): Promise<BatchAddProductsOutput> {
  return batchAddProductsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'batchAddProductsPrompt',
  input: { schema: BatchAddProductsInputSchema },
  output: { schema: BatchAddProductsOutputSchema },
  prompt: `Ты - AI ассистент для платформы KIRA AI. Твоя задача - обработать JSON с данными о товарах и привести его в соответствие со схемой.

Для каждого товара в массиве 'products':
1.  **description**: Если описание отсутствует или слишком короткое, напиши привлекательное и подробное описание на основе названия товара.
2.  **category**: Если категория не указана, определи ее по названию и описанию.
3.  **price**: Преобразуй цену из строки в число.
4.  **sizes**: Преобразуй строку с размерами, разделенными запятыми, в массив строк. Удали лишние пробелы и приведи к верхнему регистру.
5.  **imageUrls**: Преобразуй строку с URL-адресами, разделенными запятыми, в массив URL-адресов.

Верни результат в виде объекта, соответствующего 'BatchAddProductsOutputSchema', где ключ - 'processedProducts'.

Входные данные:
{{{jsonStringify products}}}

Ответ должен быть только в формате JSON.`,
});

const batchAddProductsFlow = ai.defineFlow(
  {
    name: 'batchAddProductsFlow',
    inputSchema: BatchAddProductsInputSchema,
    outputSchema: BatchAddProductsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
