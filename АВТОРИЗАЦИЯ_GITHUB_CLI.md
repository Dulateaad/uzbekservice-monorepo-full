# 🔐 Авторизация GitHub CLI

## 🚀 Быстрая авторизация:

Выполните в терминале:

```bash
gh auth login
```

Следуйте инструкциям:
1. Выберите **GitHub.com**
2. Выберите **HTTPS** (рекомендуется)
3. Выберите способ авторизации:
   - **Login with a web browser** (проще всего)
   - Или **Paste an authentication token**

## 📋 После авторизации:

Я смогу посмотреть логи сборки командой:

```bash
cd ~/uzbekservice_app
gh run list --limit 5
gh run view <run-id> --log
```

---

## 🔑 Альтернатива: Использовать токен напрямую

Если у вас есть GitHub Personal Access Token:

```bash
export GH_TOKEN=your_token_here
gh run list
```

---

**Выполните `gh auth login` и я смогу посмотреть ошибки!**

