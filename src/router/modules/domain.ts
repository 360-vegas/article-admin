import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/domain",
  name: "Domain",
  component: Layout,
  redirect: "/domain/management",
  meta: {
    icon: "ep:monitor",
    title: $t("menus.domain"),
    rank: 3,
    showLink: true
  },
  children: [
    {
      path: "/domain/management",
      name: "DomainManagement",
      component: () => import("@/views/domain/management/index.vue"),
      meta: {
        title: $t("menus.domainManagement"),
        showLink: true
      }
    },
    {
      path: "/domain/ssl",
      name: "DomainSsl",
      component: () => import("@/views/domain/ssl/index.vue"),
      meta: {
        title: $t("menus.domainSsl"),
        showLink: true
      }
    },
    {
      path: "/domain/rules",
      name: "DomainRules",
      component: () => import("@/views/domain/rules/index.vue"),
      meta: {
        title: $t("menus.domainRules"),
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
