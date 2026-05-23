<template>
  <div class="card">
    <h2>Вход врача</h2>
    <p class="hint">Firebase Auth (email/пароль). Настройте провайдера в консоли проекта.</p>
    <label>Email</label>
    <input v-model="email" type="email" autocomplete="username" />
    <label>Пароль</label>
    <input v-model="password" type="password" autocomplete="current-password" />
    <button type="button" :disabled="busy" @click="signIn">Войти</button>
    <p v-if="error" class="err">{{ error }}</p>
  </div>
</template>

<script>
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default {
  name: "LoginView",
  data() {
    return {
      email: "",
      password: "",
      busy: false,
      error: "",
    };
  },
  methods: {
    async signIn() {
      this.error = "";
      this.busy = true;
      try {
        await signInWithEmailAndPassword(auth, this.email.trim(), this.password);
        this.$router.push("/consultation");
      } catch (e) {
        this.error = e.message || String(e);
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<style scoped>
.card {
  max-width: 360px;
  margin: 2rem auto;
  background: #fff;
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
}
label {
  display: block;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #475569;
}
input {
  width: 100%;
  margin-top: 0.25rem;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-sizing: border-box;
}
button {
  margin-top: 1rem;
  padding: 0.6rem 1rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
}
.hint {
  font-size: 0.85rem;
  color: #64748b;
}
.err {
  color: #b91c1c;
  margin-top: 0.75rem;
  font-size: 0.9rem;
}
</style>
