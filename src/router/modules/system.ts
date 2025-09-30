import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/system",
  name: "System",
  component: Layout,
  redirect: "/system/tasks",
  meta: {
    icon: "ep:setting",
    title: $t("menus.system"),
    rank: 8
  },
  children: [
    {
      path: "/system/tasks",
      name: "SystemTasks",
      component: () => import("@/views/system/tasks/index.vue"),
      meta: {
        title: $t("menus.systemTaskCenter"),
        showLink: true
      }
    },
    {
      path: "/system/users-perms",
      name: "SystemUsersPerms",
      component: () => import("@/views/system/users-perms/index.vue"),
      meta: {
        title: $t("menus.systemUsersPerms"),
        showLink: true
      }
    },
    {
      path: "/system/audit-logs",
      name: "SystemAuditLogs",
      component: () => import("@/views/system/audit-logs/index.vue"),
      meta: {
        title: $t("menus.systemAuditLogs"),
        showLink: true
      }
    },
    {
      path: "/system/backup-restore",
      name: "SystemBackupRestore",
      component: () => import("@/views/system/backup-restore/index.vue"),
      meta: {
        title: $t("menus.systemBackupRestore"),
        showLink: true
      }
    },
    {
      path: "/system/settings",
      name: "SystemSettings",
      component: () => import("@/views/system/settings/index.vue"),
      meta: {
        title: $t("menus.systemSettings"),
        showLink: true
      }
    },
    {
      path: "/system/country-pack",
      name: "SystemCountryPack",
      component: () => import("@/views/system/country-pack/index.vue"),
      meta: {
        title: $t("menus.systemCountryPack"),
        showLink: true
      }
    },
    {
      path: "/system/i18n-texts",
      name: "SystemI18nTexts",
      component: () => import("@/views/system/i18n-texts/index.vue"),
      meta: {
        title: $t("menus.systemI18nTexts"),
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;


