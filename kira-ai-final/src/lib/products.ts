import type { Product } from './types';

// This is now mock data and will not be displayed in the app.
// Products are fetched from Firestore.
export const products: Product[] = [
  {
    id: '1',
    name: 'Ethereal Plum Gown',
    description:
      'A breathtaking evening gown in a deep plum shade, crafted from flowing chiffon. Perfect for making a grand entrance.',
    price: 299.99,
    imageUrl: 'https://picsum.photos/seed/plum-dress/400/500',
    category: 'Dresses',
  },
  {
    id: '2',
    name: 'Sunset Coral Blouse',
    description:
      'A vibrant silk blouse in warm coral. Its relaxed fit and luxurious feel make it a versatile piece for day or night.',
    price: 89.99,
    imageUrl: 'https://picsum.photos/seed/coral-blouse/400/500',
    category: 'Tops',
  },
  {
    id: '3',
    name: 'Breezy Linen Trousers',
    description:
      'Elegant and comfortable white linen trousers with a wide-leg cut. An essential for sophisticated summer styling.',
    price: 120.0,
    imageUrl: 'https://picsum.photos/seed/linen-trousers/400/500',
    category: 'Pants',
  },
  {
    id: '4',
    name: 'The Minimalist Handbag',
    description:
      'A modern leather handbag with a clean, structured design. Its timeless style complements any outfit.',
    price: 175.5,
    imageUrl: 'https://picsum.photos/seed/stylish-handbag/400/500',
    category: 'Accessories',
  },
];
