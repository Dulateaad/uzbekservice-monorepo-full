import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ru.dart';
import 'app_localizations_uz.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('ru'),
    Locale('uz')
  ];

  /// Название приложения
  ///
  /// In ru, this message translates to:
  /// **'ODO.UZ'**
  String get appTitle;

  /// No description provided for @home.
  ///
  /// In ru, this message translates to:
  /// **'Главная'**
  String get home;

  /// No description provided for @favorites.
  ///
  /// In ru, this message translates to:
  /// **'Избранные'**
  String get favorites;

  /// No description provided for @services.
  ///
  /// In ru, this message translates to:
  /// **'Сервисы'**
  String get services;

  /// No description provided for @profile.
  ///
  /// In ru, this message translates to:
  /// **'Профиль'**
  String get profile;

  /// No description provided for @maps.
  ///
  /// In ru, this message translates to:
  /// **'Карты'**
  String get maps;

  /// No description provided for @orders.
  ///
  /// In ru, this message translates to:
  /// **'Заказы'**
  String get orders;

  /// No description provided for @login.
  ///
  /// In ru, this message translates to:
  /// **'Войти'**
  String get login;

  /// No description provided for @register.
  ///
  /// In ru, this message translates to:
  /// **'Регистрация'**
  String get register;

  /// No description provided for @phoneNumber.
  ///
  /// In ru, this message translates to:
  /// **'Номер телефона'**
  String get phoneNumber;

  /// No description provided for @enterPhoneNumber.
  ///
  /// In ru, this message translates to:
  /// **'Введите номер телефона'**
  String get enterPhoneNumber;

  /// No description provided for @sendCode.
  ///
  /// In ru, this message translates to:
  /// **'Отправить код'**
  String get sendCode;

  /// No description provided for @verifyCode.
  ///
  /// In ru, this message translates to:
  /// **'Подтвердить код'**
  String get verifyCode;

  /// No description provided for @name.
  ///
  /// In ru, this message translates to:
  /// **'Имя'**
  String get name;

  /// No description provided for @enterName.
  ///
  /// In ru, this message translates to:
  /// **'Введите ваше имя'**
  String get enterName;

  /// No description provided for @client.
  ///
  /// In ru, this message translates to:
  /// **'Клиент'**
  String get client;

  /// No description provided for @specialist.
  ///
  /// In ru, this message translates to:
  /// **'Специалист'**
  String get specialist;

  /// No description provided for @company.
  ///
  /// In ru, this message translates to:
  /// **'Компания'**
  String get company;

  /// No description provided for @search.
  ///
  /// In ru, this message translates to:
  /// **'Поиск'**
  String get search;

  /// No description provided for @searchSpecialists.
  ///
  /// In ru, this message translates to:
  /// **'Поиск специалистов'**
  String get searchSpecialists;

  /// No description provided for @categories.
  ///
  /// In ru, this message translates to:
  /// **'Категории'**
  String get categories;

  /// No description provided for @topSpecialists.
  ///
  /// In ru, this message translates to:
  /// **'Топ специалисты'**
  String get topSpecialists;

  /// No description provided for @recommended.
  ///
  /// In ru, this message translates to:
  /// **'Рекомендуемые'**
  String get recommended;

  /// No description provided for @rating.
  ///
  /// In ru, this message translates to:
  /// **'Рейтинг'**
  String get rating;

  /// No description provided for @reviews.
  ///
  /// In ru, this message translates to:
  /// **'Отзывы'**
  String get reviews;

  /// No description provided for @price.
  ///
  /// In ru, this message translates to:
  /// **'Цена'**
  String get price;

  /// No description provided for @book.
  ///
  /// In ru, this message translates to:
  /// **'Забронировать'**
  String get book;

  /// No description provided for @viewProfile.
  ///
  /// In ru, this message translates to:
  /// **'Посмотреть профиль'**
  String get viewProfile;

  /// No description provided for @editProfile.
  ///
  /// In ru, this message translates to:
  /// **'Редактировать профиль'**
  String get editProfile;

  /// No description provided for @logout.
  ///
  /// In ru, this message translates to:
  /// **'Выйти'**
  String get logout;

  /// No description provided for @settings.
  ///
  /// In ru, this message translates to:
  /// **'Настройки'**
  String get settings;

  /// No description provided for @language.
  ///
  /// In ru, this message translates to:
  /// **'Язык'**
  String get language;

  /// No description provided for @russian.
  ///
  /// In ru, this message translates to:
  /// **'Русский'**
  String get russian;

  /// No description provided for @uzbek.
  ///
  /// In ru, this message translates to:
  /// **'Узбекский'**
  String get uzbek;

  /// No description provided for @english.
  ///
  /// In ru, this message translates to:
  /// **'Английский'**
  String get english;

  /// No description provided for @vacancy.
  ///
  /// In ru, this message translates to:
  /// **'Вакансия'**
  String get vacancy;

  /// No description provided for @vacancies.
  ///
  /// In ru, this message translates to:
  /// **'Вакансии'**
  String get vacancies;

  /// No description provided for @odoVacancy.
  ///
  /// In ru, this message translates to:
  /// **'ODO Vacancy'**
  String get odoVacancy;

  /// No description provided for @searchVacancies.
  ///
  /// In ru, this message translates to:
  /// **'Поиск вакансий...'**
  String get searchVacancies;

  /// No description provided for @selectIntent.
  ///
  /// In ru, this message translates to:
  /// **'Выбери намерение'**
  String get selectIntent;

  /// No description provided for @whatDoYouWant.
  ///
  /// In ru, this message translates to:
  /// **'Что ты хочешь сейчас?'**
  String get whatDoYouWant;

  /// No description provided for @selectNextIncomeStep.
  ///
  /// In ru, this message translates to:
  /// **'Выбери свой следующий шаг дохода'**
  String get selectNextIncomeStep;

  /// No description provided for @moreIncome.
  ///
  /// In ru, this message translates to:
  /// **'Быстрый доход'**
  String get moreIncome;

  /// No description provided for @moreIncomeDesc.
  ///
  /// In ru, this message translates to:
  /// **'Найди работу с высокой оплатой'**
  String get moreIncomeDesc;

  /// No description provided for @stability.
  ///
  /// In ru, this message translates to:
  /// **'Постоянная работа'**
  String get stability;

  /// No description provided for @stabilityDesc.
  ///
  /// In ru, this message translates to:
  /// **'Вакансии с графиком и фикс. доходом'**
  String get stabilityDesc;

  /// No description provided for @sideJob.
  ///
  /// In ru, this message translates to:
  /// **'Подработка рядом'**
  String get sideJob;

  /// No description provided for @sideJobDesc.
  ///
  /// In ru, this message translates to:
  /// **'Гибкие варианты для доп. заработка'**
  String get sideJobDesc;

  /// No description provided for @growth.
  ///
  /// In ru, this message translates to:
  /// **'Рост и обучение'**
  String get growth;

  /// No description provided for @growthDesc.
  ///
  /// In ru, this message translates to:
  /// **'Вакансии с возможностью развития'**
  String get growthDesc;

  /// No description provided for @myApplications.
  ///
  /// In ru, this message translates to:
  /// **'Мои отклики'**
  String get myApplications;

  /// No description provided for @createVacancy.
  ///
  /// In ru, this message translates to:
  /// **'Создать вакансию'**
  String get createVacancy;

  /// No description provided for @vacanciesNotFound.
  ///
  /// In ru, this message translates to:
  /// **'Вакансии не найдены'**
  String get vacanciesNotFound;

  /// No description provided for @tryChangeSearch.
  ///
  /// In ru, this message translates to:
  /// **'Попробуйте изменить параметры поиска'**
  String get tryChangeSearch;

  /// No description provided for @vacancyNotFound.
  ///
  /// In ru, this message translates to:
  /// **'Вакансия не найдена'**
  String get vacancyNotFound;

  /// No description provided for @back.
  ///
  /// In ru, this message translates to:
  /// **'Назад'**
  String get back;

  /// No description provided for @hotVacancy.
  ///
  /// In ru, this message translates to:
  /// **'🔥 Горячая'**
  String get hotVacancy;

  /// No description provided for @urgentVacancy.
  ///
  /// In ru, this message translates to:
  /// **'⚡ Срочно'**
  String get urgentVacancy;

  /// No description provided for @schedule.
  ///
  /// In ru, this message translates to:
  /// **'График'**
  String get schedule;

  /// No description provided for @location.
  ///
  /// In ru, this message translates to:
  /// **'Локация'**
  String get location;

  /// No description provided for @distance.
  ///
  /// In ru, this message translates to:
  /// **'Расстояние'**
  String get distance;

  /// No description provided for @employerRating.
  ///
  /// In ru, this message translates to:
  /// **'Рейтинг работодателя'**
  String get employerRating;

  /// No description provided for @compatibility.
  ///
  /// In ru, this message translates to:
  /// **'Совместимость'**
  String get compatibility;

  /// No description provided for @description.
  ///
  /// In ru, this message translates to:
  /// **'Описание'**
  String get description;

  /// No description provided for @requirements.
  ///
  /// In ru, this message translates to:
  /// **'Требования'**
  String get requirements;

  /// No description provided for @apply.
  ///
  /// In ru, this message translates to:
  /// **'Откликнуться'**
  String get apply;

  /// No description provided for @loginRequired.
  ///
  /// In ru, this message translates to:
  /// **'Необходимо войти в систему'**
  String get loginRequired;

  /// No description provided for @companiesCannotApply.
  ///
  /// In ru, this message translates to:
  /// **'Компании не могут подавать на вакансии'**
  String get companiesCannotApply;

  /// No description provided for @applicationSent.
  ///
  /// In ru, this message translates to:
  /// **'Отклик отправлен!'**
  String get applicationSent;

  /// No description provided for @applicationError.
  ///
  /// In ru, this message translates to:
  /// **'Ошибка при отправке отклика'**
  String get applicationError;

  /// No description provided for @onlyCompaniesCanCreate.
  ///
  /// In ru, this message translates to:
  /// **'Только компании могут создавать вакансии'**
  String get onlyCompaniesCanCreate;

  /// No description provided for @vacancyCreated.
  ///
  /// In ru, this message translates to:
  /// **'Вакансия создана!'**
  String get vacancyCreated;

  /// No description provided for @vacancyCreateError.
  ///
  /// In ru, this message translates to:
  /// **'Ошибка при создании вакансии'**
  String get vacancyCreateError;

  /// No description provided for @vacancyTitle.
  ///
  /// In ru, this message translates to:
  /// **'Название вакансии *'**
  String get vacancyTitle;

  /// No description provided for @vacancyTitleHint.
  ///
  /// In ru, this message translates to:
  /// **'Например: Frontend Developer'**
  String get vacancyTitleHint;

  /// No description provided for @enterVacancyTitle.
  ///
  /// In ru, this message translates to:
  /// **'Введите название вакансии'**
  String get enterVacancyTitle;

  /// No description provided for @companyName.
  ///
  /// In ru, this message translates to:
  /// **'Название компании *'**
  String get companyName;

  /// No description provided for @companyNameHint.
  ///
  /// In ru, this message translates to:
  /// **'Например: Tech Solutions'**
  String get companyNameHint;

  /// No description provided for @enterCompanyName.
  ///
  /// In ru, this message translates to:
  /// **'Введите название компании'**
  String get enterCompanyName;

  /// No description provided for @descriptionLabel.
  ///
  /// In ru, this message translates to:
  /// **'Описание *'**
  String get descriptionLabel;

  /// No description provided for @descriptionHint.
  ///
  /// In ru, this message translates to:
  /// **'Подробное описание вакансии'**
  String get descriptionHint;

  /// No description provided for @enterDescription.
  ///
  /// In ru, this message translates to:
  /// **'Введите описание'**
  String get enterDescription;

  /// No description provided for @salary.
  ///
  /// In ru, this message translates to:
  /// **'Зарплата (сум) *'**
  String get salary;

  /// No description provided for @salaryHint.
  ///
  /// In ru, this message translates to:
  /// **'5000000'**
  String get salaryHint;

  /// No description provided for @enterSalary.
  ///
  /// In ru, this message translates to:
  /// **'Введите зарплату'**
  String get enterSalary;

  /// No description provided for @locationLabel.
  ///
  /// In ru, this message translates to:
  /// **'Локация *'**
  String get locationLabel;

  /// No description provided for @locationHint.
  ///
  /// In ru, this message translates to:
  /// **'Ташкент'**
  String get locationHint;

  /// No description provided for @enterLocation.
  ///
  /// In ru, this message translates to:
  /// **'Введите локацию'**
  String get enterLocation;

  /// No description provided for @workSchedule.
  ///
  /// In ru, this message translates to:
  /// **'График работы'**
  String get workSchedule;

  /// No description provided for @fullTime.
  ///
  /// In ru, this message translates to:
  /// **'Полный день'**
  String get fullTime;

  /// No description provided for @partTime.
  ///
  /// In ru, this message translates to:
  /// **'Частичная занятость'**
  String get partTime;

  /// No description provided for @flexible.
  ///
  /// In ru, this message translates to:
  /// **'Гибкий график'**
  String get flexible;

  /// No description provided for @remote.
  ///
  /// In ru, this message translates to:
  /// **'Удалённо'**
  String get remote;

  /// No description provided for @category.
  ///
  /// In ru, this message translates to:
  /// **'Категория'**
  String get category;

  /// No description provided for @intentOptional.
  ///
  /// In ru, this message translates to:
  /// **'Намерение (опционально)'**
  String get intentOptional;

  /// No description provided for @notSelected.
  ///
  /// In ru, this message translates to:
  /// **'Не выбрано'**
  String get notSelected;

  /// No description provided for @requirementsLabel.
  ///
  /// In ru, this message translates to:
  /// **'Требования'**
  String get requirementsLabel;

  /// No description provided for @addRequirement.
  ///
  /// In ru, this message translates to:
  /// **'Добавить требование'**
  String get addRequirement;

  /// No description provided for @hotVacancyFlag.
  ///
  /// In ru, this message translates to:
  /// **'Горячая вакансия'**
  String get hotVacancyFlag;

  /// No description provided for @hotVacancySubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Показывать в топе'**
  String get hotVacancySubtitle;

  /// No description provided for @urgentVacancyFlag.
  ///
  /// In ru, this message translates to:
  /// **'Срочная вакансия'**
  String get urgentVacancyFlag;

  /// No description provided for @urgentVacancySubtitle.
  ///
  /// In ru, this message translates to:
  /// **'Пометить как срочную'**
  String get urgentVacancySubtitle;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'ru', 'uz'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ru':
      return AppLocalizationsRu();
    case 'uz':
      return AppLocalizationsUz();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
