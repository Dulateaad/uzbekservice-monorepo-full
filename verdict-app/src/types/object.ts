/**
 * Объект мира Verdict: одна сущность = одна картинка + подпись.
 * Карточка ссылается на два объекта (objectIdA / objectIdB).
 */
export type ObjectImageSource = 'wikimedia_commons' | 'unsplash' | 'manual';

export interface VerdictObject {
  id: string;
  label: string;
  imageUrl: string;
  imageSource?: ObjectImageSource;
  /** Внешний идентификатор (файл Commons, id фото Unsplash) */
  externalRef?: string;
  createdAt?: number;
}
