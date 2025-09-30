import { $t } from "@/plugins/i18n";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/template",
  name: "Template",
  component: Layout,
  redirect: "/template/workbench",
  meta: {
    icon: "ep:document",
    title: $t("menus.template"),
    rank: 5
  },
  children: [
    {
      path: "/template/projects",
      name: "TemplateProjects",
      component: () => import("@/views/template/workbench/projects.vue"),
      meta: {
        title: $t("menus.projects"),
        showLink: true
      }
    },
    {
      path: "/template/workbench",
      name: "TemplateWorkbench",
      component: () => import("@/views/template/workbench/index.vue"),
      meta: {
        title: $t("menus.templateWorkbench"),
        showLink: true
      }
    },
    {
      path: "/template/workbench/form",
      name: "TemplateForm",
      component: () => import("@/views/template/workbench/form.vue"),
      meta: {
        title: $t("menus.templateWorkbench"),
        showLink: false,
        dynamicLevel: 3,
        // 进入隐藏的表单页时，保持左侧菜单高亮在“模板工作台”
        activePath: "/template/workbench"
      }
    },
    {
      path: "/template/card-library",
      name: "CardLibrary",
      component: () => import("@/views/template/card-library/index.vue"),
      meta: {
        title: $t("menus.cardLibrary"),
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
