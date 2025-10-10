import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/generate",
  name: "Generate",
  component: Layout,
  redirect: "/generate/article",
  meta: {
    icon: "ep:edit",
    title: $t("menus.generate"),
    rank: 3
  },
  children: [
    // {
    //   path: "/generate/article",
    //   name: "GenerateArticle",
    //   component: () => import("@/views/generate/article/index.vue"),
    //   meta: {
    //     title: $t("menus.generateArticle"),
    //     showLink: true
    //   }
    // },
    {
      path: "/generate/entry",
      name: "GenerateEntry",
      component: () => import("@/views/generate/entry/index.vue"),
      meta: {
        title: "词条生成器",
        showLink: true
      }
    },
    // {
    //   path: "/generate/batch-copy",
    //   name: "BatchCopyGenerator",
    //   component: () => import("@/views/generate/batch-copy/index.vue"),
    //   meta: {
    //     title: "批量复制生成器",
    //     showLink: true
    //   }
    // },
    {
      path: "/generate/prompts",
      name: "GeneratePrompts",
      component: () => import("@/views/generate/prompts/index.vue"),
      meta: {
        title: "提示词管理",
        showLink: true
      }
    },
    // {
    //   path: "/generate/wiki",
    //   name: "GenerateWiki",
    //   component: () => import("@/views/generate/wiki/index.vue"),
    //   meta: {
    //     title: "提示词管理",
    //     showLink: true
    //   }
    // },
  ]
} satisfies RouteConfigsTable;


