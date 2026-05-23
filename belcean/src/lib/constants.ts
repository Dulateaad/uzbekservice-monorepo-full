import { Building2, ShoppingBag, HeartPulse, HardHat, Sparkles, Wind, Sofa, Users, UserCheck, ShieldCheck, Smile, ClipboardList, Home, Trophy, Zap, Wallet } from 'lucide-react';

export const getServices = (t: any) => {
    const servicesText = t.Constants.services;
    return [
      { slug: servicesText[0].slug, title: servicesText[0].title, description: servicesText[0].description, icon: Building2, imageId: 'service-office', imageHint: 'clean office' },
      { slug: servicesText[1].slug, title: servicesText[1].title, description: servicesText[1].description, icon: ClipboardList, imageId: 'service-subscription', imageHint: 'calendar schedule' },
      { slug: servicesText[2].slug, title: servicesText[2].title, description: servicesText[2].description, icon: Sparkles, imageId: 'service-general', imageHint: 'floor polishing' },
      { slug: servicesText[3].slug, title: servicesText[3].title, description: servicesText[3].description, icon: HardHat, imageId: 'service-construction', imageHint: 'construction site' },
      { slug: servicesText[4].slug, title: servicesText[4].title, description: servicesText[4].description, icon: Wind, imageId: 'service-windows', imageHint: 'window cleaning' },
      { slug: servicesText[5].slug, title: servicesText[5].title, description: servicesText[5].description, icon: Sofa, imageId: 'service-furniture', imageHint: 'upholstery cleaning' },
    ];
};

export const getBeforeAfterImages = () => [
  "https://firebasestorage.googleapis.com/v0/b/studio-590355839-601a4.firebasestorage.app/o/%D1%80%D1%812.jpeg?alt=media&token=35a43fc5-4368-4d9a-bcfe-62a0660e62db",
  "https://firebasestorage.googleapis.com/v0/b/studio-590355839-601a4.firebasestorage.app/o/%D1%80%D1%813.jpeg?alt=media&token=52197896-f1ab-4875-9ec8-0f66191b6d1b",
  "https://firebasestorage.googleapis.com/v0/b/studio-590355839-601a4.firebasestorage.app/o/%D1%80%D1%814.jpeg?alt=media&token=69409202-c660-4e26-a381-4a1dfcb8ce55",
  "https://firebasestorage.googleapis.com/v0/b/studio-590355839-601a4.firebasestorage.app/o/%D1%80%D1%815.jpeg?alt=media&token=4b1328bd-5f21-457b-bc1f-56214905e379"
];

export const getClientTypes = (t: any) => {
    const clientTypesText = t.Constants.client_types;
    return [
        { name: clientTypesText[0].name, icon: Building2, imageUrl: 'https://img.freepik.com/premium-vector/3d-cartoon-office-building-icon_1296140-2364.jpg?semt=ais_hybrid&w=740&q=80' },
        { name: clientTypesText[1].name, icon: Building2, imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPaby8QKhKQ595Z8p8r8wjm4BiLN8eTHnT0A&s' },
        { name: clientTypesText[2].name, icon: ShoppingBag, imageUrl: 'https://cdn3d.iconscout.com/3d/premium/thumb/shop-3d-icon-png-download-7311175.png' },
        { name: clientTypesText[3].name, icon: HeartPulse, imageUrl: 'https://cdn3d.iconscout.com/3d/premium/thumb/hospital-building-3d-icon-png-download-6742138.png' },
        { name: clientTypesText[4].name, icon: HardHat, imageUrl: 'https://img.freepik.com/premium-photo/warehouse-3d-render-icon-illustration_726846-1766.jpg' },
        { name: clientTypesText[5].name, icon: Home, imageUrl: 'https://cdn-icons-png.flaticon.com/512/10740/10740590.png' },
    ];
};

export const getPrices = (t: any) => {
    return t.Constants.prices;
};

/** Аватары по полу из словаря (`gender`: female/male); разные лица — хэш от имени */
const AVATAR_FEMALE = [
    'https://randomuser.me/api/portraits/women/65.jpg',
    'https://randomuser.me/api/portraits/women/44.jpg',
    'https://randomuser.me/api/portraits/women/68.jpg',
    'https://randomuser.me/api/portraits/women/17.jpg',
    'https://randomuser.me/api/portraits/women/33.jpg',
];
const AVATAR_MALE = [
    'https://randomuser.me/api/portraits/men/32.jpg',
    'https://randomuser.me/api/portraits/men/75.jpg',
    'https://randomuser.me/api/portraits/men/52.jpg',
    'https://randomuser.me/api/portraits/men/86.jpg',
    'https://randomuser.me/api/portraits/men/41.jpg',
];

export const getTestimonials = (t: any) => {
    const testimonials = t.HomePage.testimonials;
    return testimonials.map((item: any, index: number) => {
        if (item.business === true) {
            return {
                name: item.name,
                role: item.role,
                quote: item.quote,
                date: item.date,
                avatarUrl: '',
                isBusiness: true,
            };
        }

        const override = typeof item.avatarUrl === 'string' && item.avatarUrl.trim().length > 0 ? item.avatarUrl.trim() : null;
        const g = String(item.gender ?? '').toLowerCase();
        const useFemale =
            g === 'female' || g === 'f'
                ? true
                : g === 'male' || g === 'm'
                  ? false
                  : index % 2 === 0;

        const pool = useFemale ? AVATAR_FEMALE : AVATAR_MALE;
        const hash = (item.name ?? '').split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), index);
        const avatarUrl = override ?? pool[Math.abs(hash) % pool.length];

        return {
            name: item.name,
            role: item.role,
            quote: item.quote,
            date: item.date,
            avatarUrl,
            isBusiness: false,
        };
    });
};
