import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/analytics",
  name: "Analytics",
  component: Layout,
  redirect: "/analytics/overview",
  meta: {
    icon: "ep:data-line",
    title: $t("menus.analytics"),
    rank: 6
  },
  children: [
    {
      path: "/analytics/overview",
      name: "AnalyticsOverview",
      component: () => import("@/views/analytics/overview/index.vue"),
      meta: {
        title: $t("menus.analyticsOverview"),
        showLink: true
      }
    },
    {
      path: "/analytics/map",
      name: "AnalyticsMap",
      component: () => import("@/views/analytics/map/index.vue"),
      meta: {
        title: $t("menus.analyticsMap"),
        showLink: true
      }
    },
    {
      path: "/analytics/trend",
      name: "AnalyticsTrend",
      component: () => import("@/views/analytics/trend/index.vue"),
      meta: {
        title: $t("menus.analyticsTrend"),
        showLink: true
      }
    },
    {
      path: "/analytics/heat",
      name: "AnalyticsHeat",
      component: () => import("@/views/analytics/heat/index.vue"),
      meta: {
        title: $t("menus.analyticsHeat"),
        showLink: true
      }
    },
    {
      path: "/analytics/task-monitor",
      name: "AnalyticsTaskMonitor",
      component: () => import("@/views/analytics/task-monitor/index.vue"),
      meta: {
        title: $t("menus.analyticsTaskMonitor"),
        showLink: true
      }
    },
    {
      path: "/analytics/network",
      name: "AnalyticsNetwork",
      component: () => import("@/views/analytics/network/index.vue"),
      meta: {
        title: $t("menus.analyticsNetwork"),
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;


