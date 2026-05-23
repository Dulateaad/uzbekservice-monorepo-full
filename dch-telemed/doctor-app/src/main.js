import Vue from "vue";
import App from "./App.vue";
import VueRouter from "vue-router";
import LoginView from "./views/LoginView.vue";
import ConsultationView from "./views/ConsultationView.vue";

Vue.use(VueRouter);

const router = new VueRouter({
  mode: "history",
  base: "/",
  routes: [
    { path: "/", redirect: "/consultation" },
    { path: "/login", component: LoginView },
    { path: "/consultation", component: ConsultationView },
  ],
});

new Vue({
  router,
  render: (h) => h(App),
}).$mount("#app");
