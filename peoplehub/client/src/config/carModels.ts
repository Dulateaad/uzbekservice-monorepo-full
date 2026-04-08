export interface CarBrand {
  name: string;
  models: string[];
}

export const CAR_BRANDS: CarBrand[] = [
  // Popular in Kazakhstan
  { name: "Toyota", models: ["Camry", "Corolla", "RAV4", "Land Cruiser", "Land Cruiser Prado", "Highlander", "Avalon", "Yaris", "C-HR", "Fortuner", "Hilux", "Sequoia", "4Runner"] },
  { name: "Hyundai", models: ["Sonata", "Elantra", "Tucson", "Santa Fe", "Accent", "Creta", "Grandeur", "Palisade", "i30", "ix35", "Starex", "Staria"] },
  { name: "Kia", models: ["K5", "K8", "K9", "Cerato", "Sportage", "Sorento", "Rio", "Stinger", "Carnival", "Seltos", "Soul", "Mohave"] },
  { name: "Chevrolet", models: ["Cobalt", "Nexia", "Malibu", "Lacetti", "Gentra", "Tracker", "Captiva", "Equinox", "Tahoe", "Camaro", "Traverse", "Spark"] },
  { name: "Volkswagen", models: ["Polo", "Jetta", "Passat", "Tiguan", "Touareg", "Golf", "Arteon", "Atlas", "ID.4", "Taos"] },
  { name: "Skoda", models: ["Octavia", "Rapid", "Superb", "Kodiaq", "Karoq", "Kamiq", "Fabia"] },
  { name: "Nissan", models: ["Almera", "X-Trail", "Qashqai", "Patrol", "Juke", "Teana", "Note", "Pathfinder", "Murano", "Sentra"] },
  { name: "Honda", models: ["Civic", "Accord", "CR-V", "HR-V", "Fit", "Pilot", "Odyssey"] },
  { name: "Mazda", models: ["3", "6", "CX-5", "CX-9", "CX-30", "CX-60"] },
  { name: "Mitsubishi", models: ["Lancer", "Outlander", "Pajero", "ASX", "Eclipse Cross", "L200", "Pajero Sport"] },
  { name: "Subaru", models: ["Impreza", "Legacy", "Outback", "Forester", "XV", "WRX"] },
  { name: "Suzuki", models: ["Vitara", "SX4", "Swift", "Jimny", "Grand Vitara"] },

  // German premium
  { name: "Mercedes-Benz", models: ["C-Class", "E-Class", "S-Class", "A-Class", "CLA", "GLA", "GLC", "GLE", "GLS", "G-Class", "EQE", "EQS", "Maybach S-Class", "V-Class"] },
  { name: "BMW", models: ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "4 Series", "6 Series", "8 Series", "iX", "i4", "i5", "i7"] },
  { name: "Audi", models: ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "RS6", "RS7"] },
  { name: "Porsche", models: ["Cayenne", "Macan", "Panamera", "Taycan", "911"] },

  // Korean premium
  { name: "Genesis", models: ["G70", "G80", "G90", "GV60", "GV70", "GV80"] },

  // Japanese premium
  { name: "Lexus", models: ["ES", "GS", "IS", "LS", "NX", "RX", "LX", "UX", "GX", "LC"] },
  { name: "Infiniti", models: ["Q50", "Q60", "QX50", "QX55", "QX60", "QX80"] },

  // UK
  { name: "Land Rover", models: ["Range Rover", "Range Rover Sport", "Range Rover Velar", "Defender", "Discovery", "Discovery Sport"] },
  { name: "Jaguar", models: ["XE", "XF", "XJ", "F-Pace", "E-Pace", "I-Pace"] },
  { name: "Bentley", models: ["Continental GT", "Flying Spur", "Bentayga"] },
  { name: "Rolls-Royce", models: ["Ghost", "Phantom", "Wraith", "Cullinan", "Spectre"] },

  // USA
  { name: "Ford", models: ["Focus", "Mondeo", "Explorer", "Mustang", "F-150", "Bronco", "Kuga", "Escape", "Edge"] },
  { name: "Cadillac", models: ["CT5", "CT6", "Escalade", "XT5", "XT6", "Lyriq"] },
  { name: "Lincoln", models: ["Aviator", "Navigator", "Continental", "Corsair"] },
  { name: "Tesla", models: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"] },
  { name: "Jeep", models: ["Grand Cherokee", "Wrangler", "Cherokee", "Compass", "Renegade"] },
  { name: "Dodge", models: ["Charger", "Challenger", "Durango", "RAM 1500"] },

  // Sweden / Italy
  { name: "Volvo", models: ["S60", "S90", "XC40", "XC60", "XC90", "V60", "V90", "EX90", "C40"] },
  { name: "Maserati", models: ["Ghibli", "Quattroporte", "Levante", "Grecale", "MC20"] },

  // China premium EV
  { name: "Li Auto", models: ["L7", "L8", "L9", "MEGA"] },
  { name: "NIO", models: ["ES6", "ES7", "ES8", "ET5", "ET7", "EC6", "EC7", "EL8"] },
  { name: "XPeng", models: ["G6", "G9", "P7", "X9"] },
  { name: "Zeekr", models: ["001", "X", "009"] },
  { name: "Hongqi", models: ["H5", "H7", "H9", "HS5", "HS7", "E-HS9"] },
  { name: "Voyah", models: ["Free", "Dream"] },
  { name: "Avatr", models: ["11", "12"] },
  { name: "Denza", models: ["D9", "N7"] },
  { name: "BYD", models: ["Han", "Tang", "Song Plus", "Seal", "Dolphin", "Atto 3", "Destroyer 05"] },
  { name: "Chery", models: ["Tiggo 4", "Tiggo 7 Pro", "Tiggo 8 Pro", "Arrizo 6", "Omoda 5", "Jaecoo 7"] },
  { name: "Haval", models: ["Jolion", "F7", "H6", "Dargo", "H9"] },
  { name: "Geely", models: ["Coolray", "Atlas Pro", "Monjaro", "Tugella", "Emgrand"] },
  { name: "Changan", models: ["CS35 Plus", "CS55 Plus", "CS75 Plus", "Uni-T", "Uni-K", "Uni-V"] },
  { name: "JAC", models: ["JS4", "JS6", "S3", "S7"] },
  { name: "FAW", models: ["Besturn B70", "Besturn T77", "Besturn T99"] },
  { name: "Jetour", models: ["Dashing", "X70 Plus", "X90 Plus"] },
  { name: "Tank", models: ["300", "500"] },
  { name: "Exeed", models: ["TXL", "LX", "VX"] },

  // Other
  { name: "Lada", models: ["Vesta", "Granta", "Niva", "XRAY", "Largus"] },
  { name: "Renault", models: ["Logan", "Sandero", "Duster", "Kaptur", "Arkana", "Megane"] },
  { name: "Peugeot", models: ["208", "308", "408", "3008", "5008"] },
  { name: "Daewoo", models: ["Nexia", "Matiz", "Gentra", "Lacetti", "Cobalt"] },

  { name: "Другая", models: ["Другая"] },
];

export const CAR_COLORS = [
  "Белый", "Чёрный", "Серый", "Серебристый",
  "Синий", "Красный", "Бордовый", "Зелёный",
  "Бежевый", "Коричневый", "Золотистый", "Жёлтый",
  "Оранжевый", "Фиолетовый",
];
