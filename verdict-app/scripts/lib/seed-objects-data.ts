/**
 * Данные для seed: объекты (бесплатные URL — Wikimedia Commons / публичные источники).
 * Картинки НЕ через Vertex AI.
 */

export type ObjSeed = {
  id: string;
  label: string;
  imageUrl: string;
  imageSource: 'wikimedia_commons' | 'unsplash' | 'manual';
  externalRef?: string;
};

export type CardSeed = {
  optionA: string;
  optionB: string;
  category: string;
  objectIdA: string;
  objectIdB: string;
};

/** Уникальные объекты мира Verdict */
export const OBJECTS: ObjSeed[] = [
  // Вирусные / демо (ТЗ)
  {
    id: 'obj_iphone',
    label: 'iPhone',
    // Iphone_3G.png на Commons удалён/переименован (404) — актуальный вектор
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/32/IPhone_X_vector.svg',
    imageSource: 'wikimedia_commons',
    externalRef: 'File:IPhone X vector.svg',
  },
  {
    id: 'obj_samsung',
    label: 'Samsung',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Samsung_Galaxy_S8_and_S8%2B.png/440px-Samsung_Galaxy_S8_and_S8%2B.png',
    imageSource: 'wikimedia_commons',
    externalRef: 'File:Samsung_Galaxy_S8_and_S8+.png',
  },
  {
    id: 'obj_messi',
    label: 'Лионель Месси',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Lionel_Messi_20180713.jpg/440px-Lionel_Messi_20180713.jpg',
    imageSource: 'wikimedia_commons',
    externalRef: 'File:Lionel_Messi_20180713.jpg',
  },
  {
    id: 'obj_ronaldo',
    label: 'Криштиану Роналду',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Cristiano_Ronaldo_2018.jpg/440px-Cristiano_Ronaldo_2018.jpg',
    imageSource: 'wikimedia_commons',
    externalRef: 'File:Cristiano_Ronaldo_2018.jpg',
  },
  {
    id: 'obj_coffee',
    label: 'Кофе',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/A_small_cup_of_coffee.JPG/440px-A_small_cup_of_coffee.JPG',
    imageSource: 'wikimedia_commons',
    externalRef: 'File:A_small_cup_of_coffee.JPG',
  },
  {
    id: 'obj_tea',
    label: 'Чай',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Tasse_Tee_2.jpg/440px-Tasse_Tee_2.jpg',
    imageSource: 'wikimedia_commons',
    externalRef: 'File:Tasse_Tee_2.jpg',
  },
  {
    id: 'obj_money',
    label: 'Деньги',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/United_States_Dollar_notes.jpg/440px-United_States_Dollar_notes.jpg',
    imageSource: 'wikimedia_commons',
    externalRef: 'File:United_States_Dollar_notes.jpg',
  },
  {
    id: 'obj_love',
    label: 'Любовь',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Bright_red_heart.png/320px-Bright_red_heart.png',
    imageSource: 'wikimedia_commons',
    externalRef: 'File:Bright_red_heart.png',
  },
  // Остальные
  {
    id: 'obj_mbappe',
    label: 'Килиан Мбаппе',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Kylian_Mbapp%C3%A9_2018.jpg/440px-Kylian_Mbapp%C3%A9_2018.jpg',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_haaland',
    label: 'Эрлинг Холанд',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Erling_Haaland_2023_%28cropped%29.jpg/440px-Erling_Haaland_2023_%28cropped%29.jpg',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_pizza',
    label: 'Пицца',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Margherita_Originale.JPG/440px-Margherita_Originale.JPG',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_sushi',
    label: 'Суши',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Sushi_platter.jpg/440px-Sushi_platter.jpg',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_barcelona',
    label: 'Барселона',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/FC_Barcelona_%28crest%29.svg/440px-FC_Barcelona_%28crest%29.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_realmadrid',
    label: 'Реал Мадрид',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Real_Madrid_CF.svg/440px-Real_Madrid_CF.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_football',
    label: 'Футбол',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Football_%28soccer_ball%29.svg/440px-Football_%28soccer_ball%29.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_basketball',
    label: 'Баскетбол',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Basketball.png/440px-Basketball.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_ps5',
    label: 'PlayStation',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/PS5_logo.svg/440px-PS5_logo.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_xbox',
    label: 'Xbox',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Xbox_one_logo.svg/440px-Xbox_one_logo.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_marvel',
    label: 'Marvel',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Marvel_Logo.svg/440px-Marvel_Logo.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_dc',
    label: 'DC',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/DC_Comics_logo.svg/440px-DC_Comics_logo.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_gta',
    label: 'GTA',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Grand_Theft_Auto_logo_series.svg/440px-Grand_Theft_Auto_logo_series.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_cod',
    label: 'Call of Duty',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Call_of_Duty_Black_Ops_logo.png/440px-Call_of_Duty_Black_Ops_logo.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_minecraft',
    label: 'Minecraft',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Minecraft.svg/440px-Minecraft.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_roblox',
    label: 'Roblox',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Roblox_Logo_2022.svg/440px-Roblox_Logo_2022.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_freedom',
    label: 'Свобода',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Peace_sign.svg/320px-Peace_sign.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_sleep',
    label: 'Сон',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Moon_full.jpg/440px-Moon_full.jpg',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_success',
    label: 'Успех',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Trophy.png/320px-Trophy.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_work',
    label: 'Работа',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Briefcase_font_awesome.svg/320px-Briefcase_font_awesome.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_travel',
    label: 'Путешествия',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Icon_airplane.png/320px-Icon_airplane.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_mind',
    label: 'Разум',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Human_brain_icon.svg/320px-Human_brain_icon.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_heart',
    label: 'Сердце',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Bright_red_heart.png/320px-Bright_red_heart.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_truth',
    label: 'Правда',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Symbol_OK.svg/320px-Symbol_OK.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_comfort',
    label: 'Комфорт',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Sofa_icon.png/320px-Sofa_icon.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_stability',
    label: 'Стабильность',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Anchor_pictogram.svg/320px-Anchor_pictogram.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_dog',
    label: 'Собака',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/YellowLabradorLooking_new.jpg/440px-YellowLabradorLooking_new.jpg',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_internet',
    label: 'Интернет',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Internet1.jpg/440px-Internet1.jpg',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_cat',
    label: 'Кот',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/440px-Cat03.jpg',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_wifi',
    label: 'Wi‑Fi',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/WiFi_Logo.svg/320px-WiFi_Logo.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_day',
    label: 'День',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Sun.svg/320px-Sun.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_night',
    label: 'Ночь',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Crescent_moon_2018.svg/320px-Crescent_moon_2018.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_summer',
    label: 'Лето',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Sunshine_29.jpg/440px-Sunshine_29.jpg',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_winter',
    label: 'Зима',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Snowflakes.png/320px-Snowflakes.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_morning',
    label: 'Утро',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Sun.svg/320px-Sun.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_evening',
    label: 'Вечер',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Crescent_moon_2018.svg/320px-Crescent_moon_2018.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_sun',
    label: 'Солнце',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Sun.svg/320px-Sun.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_moon',
    label: 'Луна',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Crescent_moon_2018.svg/320px-Crescent_moon_2018.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_forgive',
    label: 'Простить',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Handshake_icon.svg/320px-Handshake_icon.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_leave',
    label: 'Уйти',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Exit_sign.svg/320px-Exit_sign.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_career',
    label: 'Карьера',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Briefcase_font_awesome.svg/320px-Briefcase_font_awesome.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_family',
    label: 'Семья',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Family_icon.png/320px-Family_icon.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_children',
    label: 'Дети',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Child_icon.svg/320px-Child_icon.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_risk',
    label: 'Риск',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Dice.png/320px-Dice.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_safety',
    label: 'Безопасность',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Blue_pill.png/320px-Blue_pill.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_logic',
    label: 'Логика',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Human_brain_icon.svg/320px-Human_brain_icon.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_intuition',
    label: 'Интуиция',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Lightbulb_icon.svg/320px-Lightbulb_icon.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_job',
    label: 'Работа',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Briefcase_font_awesome.svg/320px-Briefcase_font_awesome.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_business',
    label: 'Бизнес',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Factory_icon.svg/320px-Factory_icon.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_save',
    label: 'Экономить',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Piggy_bank.svg/320px-Piggy_bank.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_spend',
    label: 'Тратить',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/United_States_Dollar_notes.jpg/320px-United_States_Dollar_notes.jpg',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_city',
    label: 'Город',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/City_icon.png/320px-City_icon.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_village',
    label: 'Деревня',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/House_icon_2.png/320px-House_icon_2.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_sport',
    label: 'Спорт',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Football_%28soccer_ball%29.svg/320px-Football_%28soccer_ball%29.svg.png',
    imageSource: 'wikimedia_commons',
  },
  {
    id: 'obj_rest',
    label: 'Отдых',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Beach_icon.svg/320px-Beach_icon.svg.png',
    imageSource: 'wikimedia_commons',
  },
];

/** Карточки: текст на экране + два объекта */
export const CARDS: CardSeed[] = [
  { optionA: 'iPhone', optionB: 'Samsung', category: 'popular', objectIdA: 'obj_iphone', objectIdB: 'obj_samsung' },
  { optionA: 'Месси', optionB: 'Роналду', category: 'popular', objectIdA: 'obj_messi', objectIdB: 'obj_ronaldo' },
  { optionA: 'Кофе', optionB: 'Чай', category: 'popular', objectIdA: 'obj_coffee', objectIdB: 'obj_tea' },
  { optionA: 'Деньги', optionB: 'Любовь', category: 'popular', objectIdA: 'obj_money', objectIdB: 'obj_love' },
  { optionA: 'Мбаппе', optionB: 'Холанд', category: 'popular', objectIdA: 'obj_mbappe', objectIdB: 'obj_haaland' },
  { optionA: 'Пицца', optionB: 'Суши', category: 'popular', objectIdA: 'obj_pizza', objectIdB: 'obj_sushi' },
  { optionA: 'Барселона', optionB: 'Реал Мадрид', category: 'popular', objectIdA: 'obj_barcelona', objectIdB: 'obj_realmadrid' },
  { optionA: 'Футбол', optionB: 'Баскетбол', category: 'popular', objectIdA: 'obj_football', objectIdB: 'obj_basketball' },
  { optionA: 'PlayStation', optionB: 'Xbox', category: 'gaming', objectIdA: 'obj_ps5', objectIdB: 'obj_xbox' },
  { optionA: 'Marvel', optionB: 'DC', category: 'gaming', objectIdA: 'obj_marvel', objectIdB: 'obj_dc' },
  { optionA: 'GTA', optionB: 'Call of Duty', category: 'gaming', objectIdA: 'obj_gta', objectIdB: 'obj_cod' },
  { optionA: 'Minecraft', optionB: 'Roblox', category: 'gaming', objectIdA: 'obj_minecraft', objectIdB: 'obj_roblox' },
  { optionA: 'Деньги', optionB: 'Свобода', category: 'paradox', objectIdA: 'obj_money', objectIdB: 'obj_freedom' },
  { optionA: 'Любовь', optionB: 'Деньги', category: 'paradox', objectIdA: 'obj_love', objectIdB: 'obj_money' },
  { optionA: 'Сон', optionB: 'Успех', category: 'paradox', objectIdA: 'obj_sleep', objectIdB: 'obj_success' },
  { optionA: 'Работа', optionB: 'Путешествия', category: 'paradox', objectIdA: 'obj_work', objectIdB: 'obj_travel' },
  { optionA: 'Разум', optionB: 'Сердце', category: 'philosophy', objectIdA: 'obj_mind', objectIdB: 'obj_heart' },
  { optionA: 'Правда', optionB: 'Комфорт', category: 'philosophy', objectIdA: 'obj_truth', objectIdB: 'obj_comfort' },
  { optionA: 'Свобода', optionB: 'Стабильность', category: 'philosophy', objectIdA: 'obj_freedom', objectIdB: 'obj_stability' },
  { optionA: 'Собака', optionB: 'Интернет', category: 'absurd', objectIdA: 'obj_dog', objectIdB: 'obj_internet' },
  { optionA: 'Пицца', optionB: 'Сон', category: 'absurd', objectIdA: 'obj_pizza', objectIdB: 'obj_sleep' },
  { optionA: 'Кот', optionB: 'Wi-Fi', category: 'absurd', objectIdA: 'obj_cat', objectIdB: 'obj_wifi' },
  { optionA: 'День', optionB: 'Ночь', category: 'fast', objectIdA: 'obj_day', objectIdB: 'obj_night' },
  { optionA: 'Лето', optionB: 'Зима', category: 'fast', objectIdA: 'obj_summer', objectIdB: 'obj_winter' },
  { optionA: 'Кофе', optionB: 'Чай', category: 'fast', objectIdA: 'obj_coffee', objectIdB: 'obj_tea' },
  { optionA: 'Утро', optionB: 'Вечер', category: 'fast', objectIdA: 'obj_morning', objectIdB: 'obj_evening' },
  { optionA: 'Солнце', optionB: 'Луна', category: 'fast', objectIdA: 'obj_sun', objectIdB: 'obj_moon' },
  { optionA: 'Любовь', optionB: 'Свобода', category: 'love', objectIdA: 'obj_love', objectIdB: 'obj_freedom' },
  { optionA: 'Простить', optionB: 'Уйти', category: 'love', objectIdA: 'obj_forgive', objectIdB: 'obj_leave' },
  { optionA: 'Карьера', optionB: 'Семья', category: 'family', objectIdA: 'obj_career', objectIdB: 'obj_family' },
  { optionA: 'Дети', optionB: 'Карьера', category: 'family', objectIdA: 'obj_children', objectIdB: 'obj_career' },
  { optionA: 'Риск', optionB: 'Безопасность', category: 'character', objectIdA: 'obj_risk', objectIdB: 'obj_safety' },
  { optionA: 'Логика', optionB: 'Интуиция', category: 'character', objectIdA: 'obj_logic', objectIdB: 'obj_intuition' },
  { optionA: 'Работа', optionB: 'Бизнес', category: 'money', objectIdA: 'obj_job', objectIdB: 'obj_business' },
  { optionA: 'Экономить', optionB: 'Тратить', category: 'money', objectIdA: 'obj_save', objectIdB: 'obj_spend' },
  { optionA: 'Город', optionB: 'Деревня', category: 'lifestyle', objectIdA: 'obj_city', objectIdB: 'obj_village' },
  { optionA: 'Спорт', optionB: 'Отдых', category: 'lifestyle', objectIdA: 'obj_sport', objectIdB: 'obj_rest' },
];
