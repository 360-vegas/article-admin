import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/seo",
  name: "SEO",
  component: Layout,
  redirect: "/seo/internal",
  meta: {
    icon: "ep:link",
    title: $t("menus.seo"),
    rank: 4
  },
  children: [
    {
      path: "/seo/internal",
      name: "SEOInternal",
      component: () => import("@/views/seo/internal/index.vue"),
      meta: {
        title: $t("menus.seoInternalRules"),
        showLink: true
      }
    },
    {
      path: "/seo/external",
      name: "SEOExternal",
      component: () => import("@/views/seo/external/index.vue"),
      meta: {
        title: $t("menus.seoExternalStrategy"),
        showLink: true
      }
    },
    {
      path: "/seo/push-config",
      name: "SEOPushConfig",
      component: () => import("@/views/seo/push-config/index.vue"),
      meta: {
        title: $t("menus.seoPushConfig"),
        showLink: true
      }
    },
    {
      path: "/seo/push-queue",
      name: "SEOPushQueue",
      component: () => import("@/views/seo/push-queue/index.vue"),
      meta: {
        title: $t("menus.seoPushQueue"),
        showLink: true
      }
    },
    {
      path: "/seo/rss-notify",
      name: "SEORSSNotify",
      component: () => import("@/views/seo/rss-notify/index.vue"),
      meta: {
        title: $t("menus.seoRSSNotify"),
        showLink: true
      }
    },
    {
      path: "/seo/robots",
      name: "SEORobots",
      component: () => import("@/views/seo/robots/index.vue"),
      meta: {
        title: $t("menus.seoRobots"),
        showLink: true
      }
    },
    {
      path: "/seo/sitemap",
      name: "SEOSitemap",
      component: () => import("@/views/seo/sitemap/index.vue"),
      meta: {
        title: $t("menus.seoSitemap"),
        showLink: true
      }
    },
    {
      path: "/seo/push",
      name: "SEOPush",
      component: () => import("@/views/seo/push/index.vue"),
      meta: {
        title: $t("menus.seoPush"),
        showLink: true
      },
    },
    {
      path: "/seo/url-push",
      name: "URLPush",
      component: () => import("@/views/seo/url-push/index.vue"),
      meta: {
        title: "URL推送",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;


