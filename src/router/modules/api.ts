import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/api",
  name: "Api",
  component: Layout,
  redirect: "/api/keys",
  meta: {
    icon: "ep:key",
    title: $t("menus.api"),
    rank: 7
  },
  children: [
    {
      path: "/api/keys",
      name: "ApiKeys",
      component: () => import("@/views/api/keys/index.vue"),
      meta: {
        title: $t("menus.apiKeys"),
        showLink: true
      }
    },
    // {
    //   path: "/api/providers",
    //   name: "ApiProviders",
    //   component: () => import("@/views/api/providers/index.vue"),
    //   meta: {
    //     title: "AI 提供商",
    //     showLink: true
    //   }
    // },
    // {
    //   path: "/api/openapi",
    //   name: "ApiOpenAPI",
    //   component: () => import("@/views/api/openapi/index.vue"),
    //   meta: {
    //     title: $t("menus.apiOpenAPIDoc"),
    //     showLink: true
    //   }
    // },
    // {
    //   path: "/api/export",
    //   name: "ApiExport",
    //   component: () => import("@/views/api/export/index.vue"),
    //   meta: {
    //     title: $t("menus.apiContentExport"),
    //     showLink: true
    //   }
    // }
  ]
} satisfies RouteConfigsTable;


