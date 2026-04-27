'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';

interface PrivacyPolicyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAgree: () => void;
}

function PolicyBody() {
  return (
    <div className="space-y-5 text-sm text-muted-foreground">
      <div>
        <h3 className="font-bold text-foreground text-base">Приложения и сервиса KIRA AI</h3>
        <p className="mt-1">Дата вступления в силу: 1 января 2026 года</p>
        <p className="mt-2 text-foreground">Оператор: ИП «Dana Chiare»</p>
        <p>
          Email:{' '}
          <a href="mailto:admin@stylebykira.kz" className="text-primary hover:underline">
            admin@stylebykira.kz
          </a>
        </p>
        <p>
          Веб-сайт:{' '}
          <a
            href="https://stylebykira.kz"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://stylebykira.kz
          </a>
        </p>
      </div>

      <section>
        <h4 className="font-semibold text-foreground">1. Общие положения</h4>
        <p className="mt-2">
          Настоящая Политика конфиденциальности регулирует порядок сбора, обработки, хранения и защиты
          персональных данных пользователей сервиса KIRA, включая:
        </p>
        <ul className="mt-2 list-none space-y-1 pl-0">
          <li>– мобильное приложение KIRA</li>
          <li>– веб-версию</li>
          <li>– маркетплейс</li>
          <li>– AI-примерку одежды</li>
          <li>– интеграции с партнерами и брендами</li>
        </ul>
        <p className="mt-2">Мы соблюдаем требования:</p>
        <ul className="mt-2 list-none space-y-1 pl-0">
          <li>– Закона Республики Казахстан №94-V «О персональных данных и их защите»</li>
          <li>– Закона РК «Об информатизации»</li>
          <li>– иных применимых нормативных актов Республики Казахстан</li>
        </ul>
        <p className="mt-2">
          Используя сервис KIRA, пользователь даёт согласие на обработку персональных данных.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">2. Какие данные мы собираем</h4>
        <p className="mt-2">Мы можем собирать следующие категории данных:</p>

        <p className="mt-3 font-medium text-foreground">2.1 Данные аккаунта</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– имя</li>
          <li>– email</li>
          <li>– номер телефона</li>
          <li>– username</li>
          <li>– фотография профиля</li>
        </ul>

        <p className="mt-3 font-medium text-foreground">2.2 Данные примерки и AI-анализа</p>
        <p className="mt-1">При использовании AI-примерки:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– фотографии пользователя</li>
          <li>– параметры тела (если предоставлены)</li>
          <li>– изображения примеренных вещей</li>
          <li>– результаты визуализации</li>
        </ul>
        <p className="mt-2 font-medium text-foreground">Важно:</p>
        <p>
          Эти данные используются исключительно для функционирования сервиса примерки и
          персонализации рекомендаций.
        </p>

        <p className="mt-3 font-medium text-foreground">2.3 Данные заказов и маркетплейса</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– история заказов</li>
          <li>– выбранные товары</li>
          <li>– адрес доставки</li>
          <li>– платёжная информация (обрабатывается платёжным провайдером)</li>
        </ul>
        <p className="mt-1">KIRA не хранит данные банковских карт.</p>

        <p className="mt-3 font-medium text-foreground">2.4 Технические данные</p>
        <p className="mt-1">Автоматически собираются:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– IP-адрес</li>
          <li>– тип устройства</li>
          <li>– операционная система</li>
          <li>– версия приложения</li>
          <li>– язык устройства</li>
          <li>– действия пользователя внутри приложения</li>
        </ul>

        <p className="mt-3 font-medium text-foreground">2.5 Данные аналитики (Google Analytics, Firebase Analytics)</p>
        <p className="mt-1">Мы используем:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– Google Analytics</li>
          <li>– Firebase Analytics</li>
        </ul>
        <p className="mt-1">Для сбора:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– поведения пользователей</li>
          <li>– взаимодействия с интерфейсом</li>
          <li>– производительности сервиса</li>
        </ul>
        <p className="mt-1">Эти данные обезличены.</p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">3. Cookies и технологии отслеживания</h4>
        <p className="mt-2">Мы используем cookies и аналогичные технологии для:</p>
        <ul className="mt-2 list-none space-y-1 pl-0">
          <li>– аутентификации</li>
          <li>– аналитики</li>
          <li>– улучшения интерфейса</li>
          <li>– персонализации</li>
        </ul>
        <p className="mt-2">Cookies могут включать:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– session cookies</li>
          <li>– analytics cookies</li>
          <li>– functional cookies</li>
        </ul>
        <p className="mt-2">
          Пользователь может отключить cookies в настройках устройства или браузера.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">4. Цели обработки данных</h4>
        <p className="mt-2">Мы обрабатываем данные для:</p>
        <ul className="mt-2 list-none space-y-1 pl-0">
          <li>– создания и управления аккаунтом</li>
          <li>– предоставления AI-примерки</li>
          <li>– отображения одежды на пользователе</li>
          <li>– обработки заказов</li>
          <li>– доставки товаров</li>
          <li>– взаимодействия с продавцами маркетплейса</li>
          <li>– улучшения алгоритмов</li>
          <li>– персонализации рекомендаций</li>
          <li>– предотвращения мошенничества</li>
          <li>– аналитики и улучшения продукта</li>
        </ul>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">5. AI-обработка и автоматизированный анализ</h4>
        <p className="mt-2">KIRA использует алгоритмы искусственного интеллекта для:</p>
        <ul className="mt-2 list-none space-y-1 pl-0">
          <li>– визуализации одежды на пользователе</li>
          <li>– анализа стиля</li>
          <li>– рекомендаций</li>
        </ul>
        <p className="mt-2">AI может обрабатывать:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– изображения пользователя</li>
          <li>– данные примерок</li>
          <li>– предпочтения</li>
        </ul>
        <p className="mt-2">Для:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– генерации примерки</li>
          <li>– улучшения качества алгоритмов</li>
        </ul>
        <p className="mt-2">Данные используются в обезличенном виде для улучшения моделей.</p>
        <p className="mt-1">Мы не продаём фотографии пользователей.</p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">6. Передача данных третьим лицам</h4>
        <p className="mt-2">Мы можем передавать данные следующим категориям:</p>

        <p className="mt-3 font-medium text-foreground">6.1 Партнёры маркетплейса</p>
        <p className="mt-1">Для обработки заказов:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– бренды</li>
          <li>– продавцы</li>
          <li>– службы доставки</li>
        </ul>
        <p className="mt-1">Передаются только необходимые данные.</p>

        <p className="mt-3 font-medium text-foreground">6.2 Платёжные провайдеры</p>
        <p className="mt-1">Для обработки платежей:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– банки</li>
          <li>– платёжные системы</li>
        </ul>
        <p className="mt-1">KIRA не хранит данные банковских карт.</p>

        <p className="mt-3 font-medium text-foreground">6.3 Облачные провайдеры</p>
        <p className="mt-1">Мы используем:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– Google Firebase</li>
          <li>– Google Cloud</li>
        </ul>
        <p className="mt-1">Для:</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>– хранения данных</li>
          <li>– аутентификации</li>
          <li>– аналитики</li>
        </ul>

        <p className="mt-3 font-medium text-foreground">6.4 Аналитические сервисы</p>
        <ul className="mt-1 list-none space-y-1 pl-0">
          <li>Google Analytics</li>
          <li>Firebase Analytics</li>
        </ul>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">7. Где хранятся данные</h4>
        <p className="mt-2">Данные могут храниться:</p>
        <ul className="mt-2 list-none space-y-1 pl-0">
          <li>– на серверах Google Cloud</li>
          <li>– Firebase</li>
          <li>– защищённых серверах партнёров</li>
        </ul>
        <p className="mt-2">
          Сервера могут находиться за пределами Республики Казахстан. Мы обеспечиваем адекватный
          уровень защиты.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">8. Срок хранения данных</h4>
        <p className="mt-2">Мы храним данные:</p>
        <p className="mt-2">
          <span className="font-medium text-foreground">Аккаунт:</span> пока аккаунт активен
        </p>
        <p className="mt-1">
          <span className="font-medium text-foreground">Данные заказов:</span> до 5 лет (в соответствии с
          финансовыми требованиями)
        </p>
        <p className="mt-1">
          <span className="font-medium text-foreground">Аналитические данные:</span> до 24 месяцев
        </p>
        <p className="mt-1">
          <span className="font-medium text-foreground">Фотографии примерки:</span> до удаления пользователем
          или аккаунта
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">9. Права пользователя</h4>
        <p className="mt-2">Пользователь имеет право:</p>
        <ul className="mt-2 list-none space-y-1 pl-0">
          <li>– получить информацию о своих данных</li>
          <li>– изменить данные</li>
          <li>– удалить данные</li>
          <li>– отозвать согласие</li>
          <li>– удалить аккаунт</li>
        </ul>
        <p className="mt-2">
          Запрос направляется на:{' '}
          <a href="mailto:admin@stylebykira.kz" className="text-primary hover:underline">
            admin@stylebykira.kz
          </a>
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">10. Безопасность данных</h4>
        <p className="mt-2">Мы используем:</p>
        <ul className="mt-2 list-none space-y-1 pl-0">
          <li>– шифрование данных</li>
          <li>– защищённые соединения (HTTPS)</li>
          <li>– контроль доступа</li>
          <li>– защищённые серверы Google Cloud и Firebase</li>
        </ul>
        <p className="mt-2">Мы принимаем разумные меры защиты.</p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">11. Дети</h4>
        <p className="mt-2">
          Сервис не предназначен для лиц младше 16 лет без согласия родителей. Мы не собираем
          сознательно данные детей без согласия законных представителей.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">12. Основание обработки данных</h4>
        <p className="mt-2">Обработка осуществляется на основании:</p>
        <ul className="mt-2 list-none space-y-1 pl-0">
          <li>– согласия пользователя</li>
          <li>– пользовательского соглашения</li>
          <li>– требований законодательства</li>
        </ul>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">13. Удаление данных</h4>
        <p className="mt-2">Пользователь может запросить удаление:</p>
        <ul className="mt-2 list-none space-y-1 pl-0">
          <li>– аккаунта</li>
          <li>– фотографий</li>
          <li>– персональных данных</li>
        </ul>
        <p className="mt-2">
          Отправив запрос на:{' '}
          <a href="mailto:admin@stylebykira.kz" className="text-primary hover:underline">
            admin@stylebykira.kz
          </a>
        </p>
        <p className="mt-1">Удаление выполняется в разумный срок.</p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">14. Изменения политики</h4>
        <p className="mt-2">Мы можем обновлять данную Политику. Новая версия публикуется на сайте.</p>
      </section>

      <section>
        <h4 className="font-semibold text-foreground">15. Контакты</h4>
        <p className="mt-2">По всем вопросам:</p>
        <p className="mt-1">
          <a href="mailto:admin@stylebykira.kz" className="text-primary hover:underline">
            admin@stylebykira.kz
          </a>
        </p>
        <p className="mt-1">
          <a
            href="https://stylebykira.kz"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://stylebykira.kz
          </a>
        </p>
      </section>
    </div>
  );
}

export function PrivacyPolicyDialog({ isOpen, onOpenChange, onAgree }: PrivacyPolicyDialogProps) {
  const [isAgreed, setIsAgreed] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsAgreed(false);
  }, [isOpen]);

  const handleAgree = () => {
    onAgree();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ</DialogTitle>
          <DialogDescription>
            Пожалуйста, ознакомьтесь и примите нашу политику конфиденциальности, чтобы продолжить.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[min(60vh,520px)] rounded-md border p-4">
          <PolicyBody />
        </ScrollArea>
        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" checked={isAgreed} onCheckedChange={(checked) => setIsAgreed(checked as boolean)} />
            <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Я прочитал(а) и принимаю Политику конфиденциальности
            </Label>
          </div>
          <Button onClick={handleAgree} disabled={!isAgreed}>
            Принять и продолжить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
