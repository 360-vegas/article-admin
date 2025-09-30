import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/content",
  name: "Content",
  component: Layout,
  redirect: "/content/article",
  meta: {
    icon: "ep:notebook",
    title: $t("menus.content"),
    rank: 2
  },
  children: [
    {
      path: "/content/article",
      name: "ContentArticle",
      component: () => import("@/views/content/article/index.vue"),
      meta: {
        title: $t("menus.contentArticle"),
        showLink: true
      }
    },
    {
      path: "/content/category",
      name: "ContentCategory",
      component: () => import("@/views/content/category/index.vue"),
      meta: {
        title: $t("menus.contentCategory"),
        showLink: true
      }
    },
    {
      path: "/content/tag",
      name: "ContentTag",
      component: () => import("@/views/content/tag/index.vue"),
      meta: {
        title: $t("menus.contentTag"),
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;


