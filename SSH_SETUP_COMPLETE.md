# Использование локального терминала для работы с VPS

## ✅ Да, можно использовать ваш терминал macOS!

Это даже удобнее, чем VNC - можно копировать/вставлять команды, использовать несколько терминалов и т.д.

## 🔐 Подключение через SSH

### Шаг 1: Откройте терминал на macOS

Нажмите `Cmd + Space`, введите "Terminal" и откройте его.

### Шаг 2: Подключитесь к VPS

```bash
ssh root@95.46.96.53
```

Введите пароль (тот же, что использовали в VNC).

### Шаг 3: Вы увидите приглашение

```
[root@gaysyrdl ~]#
```

Теперь вы можете выполнять команды прямо из вашего терминала!

## 📋 Команды для выполнения

После подключения выполните те же команды:

### 1. Обновление системы

```bash
dnf update -y
```

### 2. Установка необходимого ПО

```bash
dnf install -y wget curl nano nginx epel-release certbot python3-certbot-nginx
```

### 3. Запуск Nginx

```bash
systemctl start nginx
systemctl enable nginx
systemctl status nginx
```

### 4. Настройка Firewall

```bash
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload
```

### 5. Создание директории

```bash
mkdir -p /var/www/webname.uz
chown -R nginx:nginx /var/www/webname.uz
chmod -R 755 /var/www/webname.uz
```

## 💡 Преимущества использования терминала

1. **Копирование/вставка** - легко копировать команды
2. **Несколько окон** - можно открыть несколько терминалов
3. **История команд** - стрелками вверх/вниз
4. **Автодополнение** - Tab для автодополнения
5. **Удобнее** - чем VNC консоль

## 🔄 Если SSH все еще не работает

Если `ssh root@95.46.96.53` не работает, используйте VNC для настройки SSH:

**Через VNC выполните:**

```bash
# Проверка SSH
systemctl status sshd

# Если не запущен
systemctl start sshd
systemctl enable sshd

# Проверка конфигурации
cat /etc/ssh/sshd_config | grep -E "PermitRootLogin|PasswordAuthentication"

# Если нужно изменить
nano /etc/ssh/sshd_config
# Убедитесь: PermitRootLogin yes
# Убедитесь: PasswordAuthentication yes

# Перезапуск SSH
systemctl restart sshd
```

После этого SSH должен работать из терминала.

## 📤 Загрузка файлов через терминал

После настройки VPS, вы сможете загружать файлы прямо из терминала:

```bash
# С локального терминала (не подключенного к VPS)
cd /Users/dulatea/uzbekservice_app
flutter build web --release
scp -r build/web/* root@95.46.96.53:/var/www/webname.uz/
```

Или используйте автоматический скрипт:

```bash
./deploy_to_vps.sh
```

## 🎯 Рекомендация

1. **Сначала настройте SSH через VNC** (если еще не работает)
2. **Затем используйте терминал** для всех дальнейших операций
3. **VNC оставьте как резервный** способ доступа

## ✅ Готово!

Теперь вы можете работать с VPS прямо из вашего терминала macOS!

