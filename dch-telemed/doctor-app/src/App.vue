<template>
  <div id="root">
    <header class="bar">
      <strong>DCH</strong>
      <nav>
        <router-link to="/consultation">Приём</router-link>
        <router-link to="/login">Вход</router-link>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<style>
#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, sans-serif;
  color: #1a1a1a;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: #0f172a;
  color: #f8fafc;
}
.bar a {
  color: #93c5fd;
  margin-left: 1rem;
}
.main {
  flex: 1;
  padding: 1rem;
  background: #f1f5f9;
}
</style>
