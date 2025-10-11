<template>
  <div class="batch-check-container">
    <!-- 提示信息 -->
    <el-alert :title="t('domain.batchCheck.alertTitle')" type="info"
      :description="t('domain.batchCheck.alertDescription')" show-icon :closable="false" class="mb-4" />

    <!-- 配置区域 -->
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="card-header">
          <span>{{ t("domain.batchCheck.configTitle") }}</span>
        </div>
      </template>

      <el-form ref="formRef" :model="formData" label-width="120px">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item :label="t('domain.batchCheck.minLength')" prop="minLength">
              <el-input-number v-model="formData.minLength" :min="2" :max="formData.maxLength - 1" :step="1"
                controls-position="right" class="w-full" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item :label="t('domain.batchCheck.maxLength')" prop="maxLength">
              <el-input-number v-model="formData.maxLength" :min="formData.minLength + 1" :max="20" :step="1"
                controls-position="right" class="w-full" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item :label="t('domain.batchCheck.quantity')" prop="quantity">
              <el-input-number v-model="formData.quantity" :min="1" :max="1000" :step="10" controls-position="right"
                class="w-full" />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12" :lg="6">
            <el-form-item :label="t('domain.batchCheck.suffix')" prop="suffix">
              <el-select v-model="formData.suffix" class="w-full" multiple
                :placeholder="t('domain.batchCheck.selectSuffix')">
                <el-option v-for="item in suffixOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item :label="t('domain.batchCheck.charType')" prop="charType">
              <el-checkbox-group v-model="formData.charType">
                <el-checkbox label="letters">{{ t("domain.batchCheck.letters") }}</el-checkbox>
                <el-checkbox label="numbers">{{ t("domain.batchCheck.numbers") }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row>
          <el-col :span="24">
            <el-form-item>
              <el-button type="primary" @click="generateDomains" :loading="generating">
                {{ t("domain.batchCheck.generate") }}
              </el-button>
              <el-button @click="resetForm">
                {{ t("buttons.reset") }}
              </el-button>
              <el-button type="success" @click="checkDomains" :disabled="!domainList.length" :loading="checking">
                {{ t("domain.batchCheck.check") }}
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 结果表格 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span>{{ t("domain.batchCheck.resultTitle") }} ({{ filteredDomainList.length }}/{{ domainList.length
            }})</span>
            <el-select v-model="statusFilter" :placeholder="t('domain.batchCheck.filterByStatus')" clearable
              size="small" style="margin-left: 16px; width: 150px;">
              <el-option :label="`${t('domain.batchCheck.all')} (${domainList.length})`" value="" />
              <el-option :label="`${t('domain.batchCheck.statusPending')} (${statusCounts.pending})`" value="pending" />
              <el-option :label="`${t('domain.batchCheck.statusAvailable')} (${statusCounts.available})`"
                value="available" />
              <el-option :label="`${t('domain.batchCheck.statusRegistered')} (${statusCounts.registered})`"
                value="registered" />
              <el-option :label="`${t('domain.batchCheck.statusMaybeNew')} (${statusCounts.maybeNew})`"
                value="maybeNew" />
            </el-select>
          </div>
          <div class="header-right">
            <el-space>
              <el-tag v-if="statusCounts.available > 0" type="primary" size="small">
                {{ t('domain.batchCheck.statusAvailable') }}: {{ statusCounts.available }}
              </el-tag>
              <el-tag v-if="statusCounts.registered > 0" type="danger" size="small">
                {{ t('domain.batchCheck.statusRegistered') }}: {{ statusCounts.registered }}
              </el-tag>
              <el-button type="danger" size="small" @click="clearTable" v-if="domainList.length">
                {{ t("buttons.clear") }}
              </el-button>
            </el-space>
          </div>
        </div>
      </template>

      <el-table :data="paginatedData" style="width: 100%" v-loading="tableLoading" border>
        <el-table-column type="index" :label="t('domain.batchCheck.index')" width="60" :index="indexMethod" />
        <el-table-column :label="t('domain.batchCheck.domainName')" prop="domain" min-width="150"
          show-overflow-tooltip />
        <el-table-column :label="t('domain.batchCheck.status')" prop="status" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('domain.batchCheck.checkTime')" prop="checkTime" width="180" show-overflow-tooltip />
      </el-table>

      <!-- 分页器 -->
      <el-pagination v-if="filteredDomainList.length > 0" v-model:current-page="currentPage"
        v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]" :total="filteredDomainList.length"
        layout="total, sizes, prev, pager, next, jumper" style="margin-top: 16px; text-align: right;" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import { batchCheckDomains } from "@/api/domainCheck";

const { t } = useI18n();

// 表单数据
const formData = reactive({
  minLength: 3,
  maxLength: 8,
  quantity: 50,
  suffix: [".com", ".net"],
  charType: ["letters"]
});

const formRef = ref();
const generating = ref(false);
const checking = ref(false);
const tableLoading = ref(false);

// 域名后缀选项
const suffixOptions = [
  ".com",
  ".net",
  ".org",
  ".cn",
  ".com.cn",
  ".info",
  ".biz",
  ".cc",
  ".tv",
  ".me",
  ".co",
  ".io",
  ".ai",
  ".app",
  ".dev",
  ".in",
  ".top",
  ".xyz",
  ".shop",
  ".club",
  ".link",
  ".site",
  ".wang",
  ".store",
  ".pub",
  ".fun",
  ".online",
  ".live",
  ".pro",
  ".name",
  ".tech",
  ".email",
  ".tel",
  ".mobi",
  ".gov",
  ".org",
  ".mil",
  ".int",
  ".arpa",
  ".local",
  ".internal",
  ".test",
  ".dev"
];

// 域名列表数据
const domainList = ref([]);
const currentPage = ref(1);
const pageSize = ref(20);
const statusFilter = ref(''); // 状态筛选

// 根据状态筛选域名
const filteredDomainList = computed(() => {
  if (!statusFilter.value) {
    return domainList.value;
  }
  return domainList.value.filter(item => item.status === statusFilter.value);
});

// 计算分页数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredDomainList.value.slice(start, end);
});

// 索引方法
const indexMethod = (index: number) => {
  return index + 1 + (currentPage.value - 1) * pageSize.value;
};

// 监听状态筛选变化，重置页码
watch(statusFilter, () => {
  currentPage.value = 1;
});

// 统计各状态的数量
const statusCounts = computed(() => {
  const counts = {
    pending: 0,
    checking: 0,
    available: 0,
    registered: 0,
    maybeNew: 0,
    error: 0
  };

  domainList.value.forEach(domain => {
    if (counts.hasOwnProperty(domain.status)) {
      counts[domain.status]++;
    }
  });

  return counts;
});

// 生成随机字符串
const generateRandomString = (minLength: number, maxLength: number, includeLetters: boolean, includeNumbers: boolean) => {
  let chars = "";
  if (includeLetters) chars += "abcdefghijklmnopqrstuvwxyz";
  if (includeNumbers) chars += "0123456789";

  if (!chars) return "";

  // 在最小和最大长度之间随机选择一个长度
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 生成域名
const generateDomains = () => {
  if (!formData.charType.length) {
    ElMessage.warning(t("domain.batchCheck.selectCharType"));
    return;
  }

  if (!formData.suffix.length) {
    ElMessage.warning(t("domain.batchCheck.selectSuffixTip"));
    return;
  }

  generating.value = true;

  const includeLetters = formData.charType.includes("letters");
  const includeNumbers = formData.charType.includes("numbers");

  // 收集现有域名以避免重复
  const existingDomains = new Set(domainList.value.map(d => d.domain));
  const generatedSet = new Set();
  let newDomainsCount = 0;

  setTimeout(() => {
    while (newDomainsCount < formData.quantity) {
      const randomStr = generateRandomString(formData.minLength, formData.maxLength, includeLetters, includeNumbers);

      for (const suffix of formData.suffix) {
        if (newDomainsCount >= formData.quantity) break;

        const domain = randomStr + suffix;
        if (!generatedSet.has(domain) && !existingDomains.has(domain)) {
          generatedSet.add(domain);
          domainList.value.push({
            id: Date.now() + Math.random(),
            domain: domain,
            status: "pending",
            checkTime: "-"
          });
          newDomainsCount++;
        }
      }
    }

    generating.value = false;
    ElMessage.success(t("domain.batchCheck.generateSuccess", { count: newDomainsCount }));
  }, 100);
};

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields();
  formData.minLength = 3;
  formData.maxLength = 5;
  formData.quantity = 50;
  formData.suffix = [".com", ".net"];
  formData.charType = ["letters"];
};

// 清空表格
const clearTable = () => {
  domainList.value = [];
  ElMessage.info(t("domain.batchCheck.cleared"));
};

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap = {
    pending: t("domain.batchCheck.statusPending"),
    checking: t("domain.batchCheck.statusChecking"),
    available: t("domain.batchCheck.statusAvailable"),
    registered: t("domain.batchCheck.statusRegistered"),
    maybeNew: t("domain.batchCheck.statusMaybeNew"),
    error: t("domain.batchCheck.statusError")
  };
  return statusMap[status] || status;
};

// 获取状态类型（颜色）
const getStatusType = (status: string) => {
  const typeMap = {
    pending: "info",      // 待检测 - 灰色
    checking: "warning",  // 检测中 - 橙色
    available: "primary", // 可能全新 - 蓝色
    registered: "danger", // 已注册 - 红色
    maybeNew: "info",     // 未知状态 - 灰色
    error: "danger"       // 检测失败 - 红色
  };
  return typeMap[status] || "info";
};

// 检查域名是否已注册（使用真实API）
const checkDomains = async () => {
  if (!domainList.value.length) {
    ElMessage.warning(t("domain.batchCheck.noDomains"));
    return;
  }

  // 筛选出待检测的域名
  const pendingDomains = domainList.value.filter(d => d.status === "pending");
  if (pendingDomains.length === 0) {
    ElMessage.warning("没有待检测的域名");
    return;
  }

  checking.value = true;
  tableLoading.value = true;

  try {
    // 如果是真实API模式，提示用户
    const confirmResult = await ElMessageBox.confirm(
      `即将对 ${pendingDomains.length} 个域名进行真实检测，这将通过DNS查询判断域名是否已注册。是否继续？`,
      '确认检测',
      {
        confirmButtonText: '开始检测',
        cancelButtonText: '取消',
        type: 'info'
      }
    ).catch(() => false);

    if (!confirmResult) {
      checking.value = false;
      tableLoading.value = false;
      return;
    }

    ElMessage.info('正在进行真实域名检测，请稍候...');

    // 将待检测的域名设置为检测中状态
    pendingDomains.forEach(domain => {
      const index = domainList.value.findIndex(d => d.domain === domain.domain);
      if (index !== -1) {
        domainList.value[index].status = "checking";
      }
    });

    // 分批检测域名（每批最多20个）
    const batchSize = 20;
    const domainNames = pendingDomains.map(d => d.domain);

    for (let i = 0; i < domainNames.length; i += batchSize) {
      const batch = domainNames.slice(i, i + batchSize);

      try {
        // 调用真实的批量检测API
        const response: any = await batchCheckDomains(batch);
        console.log('API响应:', response); // 调试日志

        // 处理不同的响应格式
        const results = response?.data?.results || response?.results || response?.data;

        if (results && Array.isArray(results)) {
          // 更新域名状态
          results.forEach((result: any) => {
            const index = domainList.value.findIndex(d => d.domain === result.domain);
            if (index !== -1) {
              domainList.value[index].status = result.status === 'available' ? 'available' : 'registered';
              domainList.value[index].checkTime = new Date().toLocaleString();
            }
          });
        } else {
          console.error('无法解析API响应:', response);
          throw new Error('API响应格式错误');
        }
      } catch (error) {
        console.error('批量检测失败:', error);

        // 检测失败的域名标记为错误状态
        batch.forEach(domain => {
          const index = domainList.value.findIndex(d => d.domain === domain);
          if (index !== -1 && domainList.value[index].status === 'checking') {
            domainList.value[index].status = 'error';
            domainList.value[index].checkTime = new Date().toLocaleString();
          }
        });
      }

      // 如果还有下一批，显示进度
      if (i + batchSize < domainNames.length) {
        const progress = Math.min(i + batchSize, domainNames.length);
        ElMessage.info(`已检测 ${progress}/${domainNames.length} 个域名...`);
        // 添加小延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

  } catch (error) {
    console.error('域名检测失败:', error);
    ElMessage.error('域名检测失败: ' + (error.message || '未知错误'));

    // 将所有检测中的域名恢复为待检测状态
    domainList.value.forEach(domain => {
      if (domain.status === 'checking') {
        domain.status = 'pending';
      }
    });
  } finally {
    checking.value = false;
    tableLoading.value = false;

    const availableCount = domainList.value.filter(d => d.status === "available").length;
    const registeredCount = domainList.value.filter(d => d.status === "registered").length;
    const errorCount = domainList.value.filter(d => d.status === "error").length;

    let message = t("domain.batchCheck.checkComplete", {
      total: pendingDomains.length,
      available: availableCount
    });

    if (registeredCount > 0) {
      message += ` (${registeredCount}个已注册)`;
    }
    if (errorCount > 0) {
      message += ` (${errorCount}个检测失败)`;
    }

    ElMessage.success(message);
  }
};
</script>

<style scoped>
.batch-check-container {
  padding: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-checkbox-group) {
  display: flex;
  gap: 20px;
}
</style>
