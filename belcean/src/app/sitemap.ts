import { MetadataRoute } from 'next';
import { i18n } from '@/i18n-config';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://beclean.uz'; 

  const serviceSlugs = [
    '/uborka-ofisov-tashkent',
    '/abonentskiy-klining',
    '/generalnaya-uborka',
    '/poslestroitelnaya-uborka',
    '/moika-okon',
    '/himchistka-mebeli',
    '/calculator',
    '/quiz'
  ];

  const staticPages = ['/'];
  const allPages = [...staticPages, ...serviceSlugs];
  const urls: MetadataRoute.Sitemap = [];

  i18n.locales.forEach((locale) => {
    allPages.forEach((page) => {
      urls.push({
        url: `${baseUrl}/${locale}${page === '/' ? '' : page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: page === '/' ? 1.0 : 0.8,
      });
    });
  });

  return urls;
}
