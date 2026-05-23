import 'package:flutter/material.dart';

/// Идентификатор вертикали — задаёт подписи и термины в Business Hub.
abstract final class BusinessVerticalIds {
  static const services = 'services';
  static const restaurant = 'restaurant';
  static const retail = 'retail';
  static const manufacturing = 'manufacturing';
  static const realEstate = 'real_estate';
  static const construction = 'construction';

  static const List<String> all = [
    services,
    restaurant,
    retail,
    manufacturing,
    realEstate,
    construction,
  ];
}

/// Набор подписей под выбранный тип бизнеса (универсальное ядро + терминология).
class BusinessVerticalSpec {
  final String id;
  final String title;
  final IconData icon;
  /// Подзаголовок под названием компании / в шапке Hub.
  final String hubSubtitle;
  /// Как называть товарные позиции в CRM / складской логике.
  final String nomenclatureLabel;
  /// Короткая подсказка для сделок и воронки.
  final String pipelineHint;
  final String crmCatalogTitle;
  final String dealPositionsHeading;
  final String dealPositionSheetTitle;
  final String crmProductFieldLabel;
  final String newCatalogItemDialogTitle;
  final String emptyDealLinesHint;
  final String addCatalogFirstMessage;
  final String quickStartBanner;

  const BusinessVerticalSpec({
    required this.id,
    required this.title,
    required this.icon,
    required this.hubSubtitle,
    required this.nomenclatureLabel,
    required this.pipelineHint,
    required this.crmCatalogTitle,
    required this.dealPositionsHeading,
    required this.dealPositionSheetTitle,
    required this.crmProductFieldLabel,
    required this.newCatalogItemDialogTitle,
    required this.emptyDealLinesHint,
    required this.addCatalogFirstMessage,
    required this.quickStartBanner,
  });

  static const BusinessVerticalSpec services = BusinessVerticalSpec(
    id: BusinessVerticalIds.services,
    title: 'Услуги',
    icon: Icons.handyman_outlined,
    hubSubtitle: 'Услуги, мастера и заказы клиентов',
    nomenclatureLabel: 'Услуги и позиции',
    pipelineHint: 'Клиент → сделка → заказ',
    crmCatalogTitle: 'Каталог',
    dealPositionsHeading: 'Позиции сделки',
    dealPositionSheetTitle: 'Позиция сделки',
    crmProductFieldLabel: 'Позиция',
    newCatalogItemDialogTitle: 'Новая позиция',
    emptyDealLinesHint: 'Нет позиций. Добавьте позицию в справочнике.',
    addCatalogFirstMessage: 'Сначала добавьте позиции: CRM → Ещё → Каталог',
    quickStartBanner: 'Быстрый старт: клиент → сделка → заказ',
  );

  static const BusinessVerticalSpec restaurant = BusinessVerticalSpec(
    id: BusinessVerticalIds.restaurant,
    title: 'Общепит',
    icon: Icons.restaurant_outlined,
    hubSubtitle: 'Меню, зал, брони и выручка',
    nomenclatureLabel: 'Блюда и позиции меню',
    pipelineHint: 'Гость → бронь / заказ → оплата',
    crmCatalogTitle: 'Меню',
    dealPositionsHeading: 'Позиции заказа',
    dealPositionSheetTitle: 'Позиция заказа',
    crmProductFieldLabel: 'Блюдо / позиция',
    newCatalogItemDialogTitle: 'Новая позиция меню',
    emptyDealLinesHint: 'Нет позиций. Добавьте блюдо в меню (CRM → Ещё).',
    addCatalogFirstMessage: 'Сначала заведите блюда: CRM → Ещё → Меню',
    quickStartBanner: 'Быстрый старт: гость → заказ → оплата',
  );

  static const BusinessVerticalSpec retail = BusinessVerticalSpec(
    id: BusinessVerticalIds.retail,
    title: 'Розница',
    icon: Icons.storefront_outlined,
    hubSubtitle: 'Магазин, остатки и продажи',
    nomenclatureLabel: 'Товары и SKU',
    pipelineHint: 'Покупатель → сделка → отгрузка',
    crmCatalogTitle: 'Товары',
    dealPositionsHeading: 'Позиции сделки',
    dealPositionSheetTitle: 'Позиция в сделке',
    crmProductFieldLabel: 'Товар',
    newCatalogItemDialogTitle: 'Новый товар',
    emptyDealLinesHint: 'Нет позиций. Добавьте товар в каталог.',
    addCatalogFirstMessage: 'Сначала добавьте товары: CRM → Ещё → Товары',
    quickStartBanner: 'Быстрый старт: покупатель → сделка → отгрузка',
  );

  static const BusinessVerticalSpec manufacturing = BusinessVerticalSpec(
    id: BusinessVerticalIds.manufacturing,
    title: 'Производство',
    icon: Icons.precision_manufacturing_outlined,
    hubSubtitle: 'Сырьё, выпуск и отгрузки',
    nomenclatureLabel: 'Материалы и продукция',
    pipelineHint: 'Заказ → производство → отгрузка',
    crmCatalogTitle: 'Номенклатура',
    dealPositionsHeading: 'Позиции сделки',
    dealPositionSheetTitle: 'Позиция сделки',
    crmProductFieldLabel: 'Номенклатура',
    newCatalogItemDialogTitle: 'Новая позиция',
    emptyDealLinesHint: 'Нет позиций. Добавьте номенклатуру в справочнике.',
    addCatalogFirstMessage: 'Сначала добавьте номенклатуру: CRM → Ещё → Номенклатура',
    quickStartBanner: 'Быстрый старт: заказ → производство → отгрузка',
  );

  static const BusinessVerticalSpec realEstate = BusinessVerticalSpec(
    id: BusinessVerticalIds.realEstate,
    title: 'Недвижимость',
    icon: Icons.apartment_outlined,
    hubSubtitle: 'Объекты, лиды и сделки',
    nomenclatureLabel: 'Объекты и лоты',
    pipelineHint: 'Лид → просмотр → бронь / сделка',
    crmCatalogTitle: 'Объекты',
    dealPositionsHeading: 'Объекты в сделке',
    dealPositionSheetTitle: 'Объект в сделке',
    crmProductFieldLabel: 'Объект',
    newCatalogItemDialogTitle: 'Новый объект',
    emptyDealLinesHint: 'Нет объектов. Добавьте объект в каталог.',
    addCatalogFirstMessage: 'Сначала добавьте объекты: CRM → Ещё → Объекты',
    quickStartBanner: 'Быстрый старт: лид → просмотр → сделка',
  );

  static const BusinessVerticalSpec construction = BusinessVerticalSpec(
    id: BusinessVerticalIds.construction,
    title: 'Строительство',
    icon: Icons.engineering_outlined,
    hubSubtitle: 'Подряды, сметы и этапы работ',
    nomenclatureLabel: 'Материалы и работы',
    pipelineHint: 'Заявка → договор → этапы оплаты',
    crmCatalogTitle: 'Смета',
    dealPositionsHeading: 'Позиции сделки',
    dealPositionSheetTitle: 'Позиция сметы',
    crmProductFieldLabel: 'Позиция сметы',
    newCatalogItemDialogTitle: 'Новая позиция',
    emptyDealLinesHint: 'Нет позиций. Добавьте позиции в справочнике сметы.',
    addCatalogFirstMessage: 'Сначала добавьте позиции: CRM → Ещё → Смета',
    quickStartBanner: 'Быстрый старт: заявка → договор → этапы',
  );

  static final Map<String, BusinessVerticalSpec> _byId = {
    BusinessVerticalIds.services: services,
    BusinessVerticalIds.restaurant: restaurant,
    BusinessVerticalIds.retail: retail,
    BusinessVerticalIds.manufacturing: manufacturing,
    BusinessVerticalIds.realEstate: realEstate,
    BusinessVerticalIds.construction: construction,
  };

  static BusinessVerticalSpec byId(String? id) =>
      _byId[id] ?? services;

  static List<BusinessVerticalSpec> get all => [
        services,
        restaurant,
        retail,
        manufacturing,
        realEstate,
        construction,
      ];
}
