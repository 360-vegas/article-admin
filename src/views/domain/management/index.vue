<script setup lang="ts">
import { onMounted, reactive, ref, computed } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { safeSplitAndFilter } from "@/utils/safeSplit";
import {
  getCloudflareZones,
  getDnsRecords,
  createDnsRecord,
  updateDnsRecord,
  deleteDnsRecord,
  deleteDnsRecordsByType,
  deleteDnsRecordsBatch,
  deleteLocalDomainsBatch,
  createDnsRecordsBatch,
  deleteDnsRecordsByTypeAcrossZones,
  createDnsRecordsAcrossZones,
  getDomainGroups,
  batchAssignDomainGroup,
  createOrUpdateDomainGroup,
  type DomainGroup,
  type CloudflareZone,
  type DnsRecord
} from "@/api/cloudflare";

defineOptions({ name: "DomainManagement" });

const { t } = useI18n();

// Zones
const zones = ref<CloudflareZone[]>([]);
const loadingZones = ref(false);
const selectedZoneId = ref<string>("");
const zoneKeyword = ref("");
const selectedZoneName = ref("");
const groupFilterId = ref<string | undefined>(undefined);
const groups = ref<DomainGroup[]>([]);
const prevGroupFilterId = ref<string | undefined>(undefined);

function handleGroupFilterChange(val?: string) {
  if (val === "__ADD__") {
    // revert to previous selection and open dialog
    groupFilterId.value = prevGroupFilterId.value;
    openGroupDialog();
  } else {
    prevGroupFilterId.value = val;
  }
}

const filteredZones = computed(() => {
  const kw = zoneKeyword.value.trim().toLowerCase();
  return zones.value.filter(z => {
    const matchKw = !kw || z.name.toLowerCase().includes(kw);
    const matchGroup = !groupFilterId.value || z.group_id === groupFilterId.value;
    return matchKw && matchGroup;
  });
});
// selected zones for batch operations
const selectedZoneIds = ref<string[]>([]);
const editingZoneId = ref<string | null>(null);
const editingZoneDraft = reactive({ group_id: "" as string, group_description: "" as string });

// Records
const records = ref<DnsRecord[]>([]);
const loadingRecords = ref(false);

// Table helpers
const searchKeyword = ref("");
const filterType = ref<string | undefined>();

const filteredRecords = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase();
  return records.value.filter(r => {
    const matchKw = !kw || r.name.toLowerCase().includes(kw) || r.content.toLowerCase().includes(kw);
    const matchType = !filterType.value || r.type === filterType.value;
    return matchKw && matchType;
  });
});

// Dialog/form
const showDialog = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance | null>(null);
const editingRecord = ref<DnsRecord | null>(null);
const formData = reactive({
  type: "A",
  name: "",
  content: "",
  ttl: 300,
  proxied: false
});

// DNS 管理弹窗
const showDnsDialog = ref(false);

function openDnsDialog(zone: CloudflareZone) {
  selectedZoneId.value = zone.id;
  selectedZoneName.value = zone.name;
  showDnsDialog.value = true;
  loadRecords();
}

// Inline edit in table
const editingRowId = ref<string | null>(null);
const editingDraft = reactive({
  type: "A" as string,
  name: "" as string,
  content: "" as string,
  ttl: 300 as number,
  proxied: false as boolean
});

function startRowEdit(row: DnsRecord) {
  // 如果已经是当前行的编辑态，则不重复重置草稿，避免覆盖正在修改的值
  if (editingRowId.value === row.id) return;
  editingRowId.value = row.id;
  Object.assign(editingDraft, {
    type: row.type,
    name: row.name,
    content: row.content,
    ttl: row.ttl,
    proxied: row.proxied
  });
}

async function saveRowEdit(row: DnsRecord) {
  if (!editingRowId.value || editingRowId.value !== row.id) return;
  try {
    await updateDnsRecord(selectedZoneId.value, row.id, { ...editingDraft });
    ElMessage.success(t("dns.updateSuccess"));
    editingRowId.value = null;
    await loadRecords();
  } catch (e) {
    ElMessage.error(t("dns.saveError"));
  }
}

const rules: FormRules = {
  type: [{ required: true, message: t("dns.typeRequired"), trigger: "change" }],
  name: [{ required: true, message: t("dns.nameRequired"), trigger: "blur" }],
  content: [{ required: true, message: t("dns.contentRequired"), trigger: "blur" }],
  ttl: [{ required: true, message: t("dns.ttlRequired"), trigger: "change" }]
};

function resetForm() {
  Object.assign(formData, { type: "A", name: "", content: "", ttl: 300, proxied: false });
  editingRecord.value = null;
  formRef.value?.resetFields();
}

async function loadZones() {
  loadingZones.value = true;
  try {
    const res = await getCloudflareZones();
    zones.value = res.data || [];
    if (!selectedZoneId.value && zones.value.length) {
      selectedZoneId.value = zones.value[0].id;
      await loadRecords();
    }
  } catch (e) {
    ElMessage.error(t("domain.loadError"));
  } finally {
    loadingZones.value = false;
  }
}

async function loadGroups() {
  try {
    const res = await getDomainGroups();
    groups.value = (res as any)?.data || [];
  } catch (e) {
    // ignore
  }
}

async function handleBatchDeleteDomains() {
  if (selectedZoneIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedZoneIds.value.length} 个域名？此操作不可恢复。`, "确认删除", { type: "warning" });
    await deleteLocalDomainsBatch(selectedZoneIds.value);
    ElMessage.success("删除成功");
    selectedZoneIds.value = [];
    await loadZones();
  } catch (e) {
    if (e !== "cancel") ElMessage.error("删除失败");
  }
}

async function loadRecords() {
  if (!selectedZoneId.value) return;
  loadingRecords.value = true;
  try {
    const res = await getDnsRecords(selectedZoneId.value);
    records.value = res.data || [];
  } catch (e) {
    ElMessage.error(t("dns.loadError"));
  } finally {
    loadingRecords.value = false;
  }
}

// record multi-select and batch operations
const selectedRecordIds = ref<string[]>([]);
const batchDeleteType = ref<string | undefined>(undefined);

async function handleBatchDeleteRecords() {
  if (!selectedZoneId.value || selectedRecordIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedRecordIds.value.length} 条记录？`, "确认删除", { type: "warning" });
    await deleteDnsRecordsBatch(selectedZoneId.value, selectedRecordIds.value);
    ElMessage.success("删除成功");
    selectedRecordIds.value = [];
    await loadRecords();
  } catch (e) {
    if (e !== "cancel") ElMessage.error("删除失败");
  }
}

async function handleDeleteRecordsByType() {
  if (!batchDeleteType.value) return;
  try {
    if (selectedZoneIds.value.length > 1) {
      // 多域名
      await ElMessageBox.confirm(`确认删除选中 ${selectedZoneIds.value.length} 个域名下所有 ${batchDeleteType.value} 记录？`, "确认删除", { type: "warning" });
      await deleteDnsRecordsByTypeAcrossZones(selectedZoneIds.value, batchDeleteType.value);
      ElMessage.success("已发起多域名删除");
    } else {
      // 单域名（使用当前 zoneId）
      if (!selectedZoneId.value) return;
      await ElMessageBox.confirm(`确认删除该域名下所有 ${batchDeleteType.value} 记录？`, "确认删除", { type: "warning" });
      await deleteDnsRecordsByType(selectedZoneId.value, batchDeleteType.value);
      ElMessage.success("删除成功");
      await loadRecords();
    }
    batchDeleteType.value = undefined;
  } catch (e) {
    if (e !== "cancel") ElMessage.error("删除失败");
  }
}

// 批量新增记录（JSON）
const showBatchCreate = ref(false);
const batchCreateText = ref(
  '[\n  { "type": "A", "name": "www", "content": "1.2.3.4", "ttl": 300, "proxied": false }\n]'
);

async function handleBatchCreateRecords() {
  try {
    const records: any = JSON.parse(batchCreateText.value || "[]");
    if (!Array.isArray(records) || records.length === 0) {
      ElMessage.warning("请填写有效的记录数组");
      return;
    }
    if (selectedZoneIds.value.length > 1) {
      await createDnsRecordsAcrossZones(selectedZoneIds.value, records);
      ElMessage.success("已发起多域名创建");
    } else {
      if (!selectedZoneId.value) return;
      await createDnsRecordsBatch(selectedZoneId.value, records);
      ElMessage.success("创建成功");
      await loadRecords();
    }
    showBatchCreate.value = false;
  } catch (e) {
    ElMessage.error("创建失败，请检查JSON格式");
  }
}

function handleCreate() {
  resetForm();
  showDialog.value = true;
}

function handleEdit(row: DnsRecord) {
  editingRecord.value = row;
  Object.assign(formData, {
    type: row.type,
    name: row.name,
    content: row.content,
    ttl: row.ttl,
    proxied: row.proxied
  });
  showDialog.value = true;
}

async function handleDelete(row: DnsRecord) {
  try {
    await ElMessageBox.confirm(t("dns.confirmDeleteRecord", { name: row.name }), t("dns.confirmDelete"), {
      type: "warning"
    });
    await deleteDnsRecord(selectedZoneId.value, row.id);
    ElMessage.success(t("dns.deleteSuccess", { name: row.name }));
    await loadRecords();
  } catch (e) {
    if (e !== "cancel") ElMessage.error(t("dns.deleteError"));
  }
}

async function handleSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate();
  if (!valid) return;
  submitting.value = true;
  try {
    if (editingRecord.value) {
      await updateDnsRecord(selectedZoneId.value, editingRecord.value.id, { ...formData });
      ElMessage.success(t("dns.updateSuccess"));
    } else {
      await createDnsRecord(selectedZoneId.value, { ...formData });
      ElMessage.success(t("dns.createSuccess"));
    }
    showDialog.value = false;
    resetForm();
    await loadRecords();
  } catch (e) {
    ElMessage.error(t("dns.saveError"));
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadZones();
  loadGroups();
});

// --- Zone inline edit ---
function startZoneEdit(row: CloudflareZone) {
  if (editingZoneId.value === row.id) return;
  editingZoneId.value = row.id;
  editingZoneDraft.group_id = row.group_id || "";
  editingZoneDraft.group_description = row.group_description || "";
}

async function saveZoneEdit(row: CloudflareZone) {
  try {
    // 更新分组说明（更新到分组）
    if (editingZoneDraft.group_id) {
      const grp = groups.value.find(g => g.id === editingZoneDraft.group_id);
      if (grp && editingZoneDraft.group_description !== undefined) {
        await createOrUpdateDomainGroup({ id: grp.id, name: grp.name, description: editingZoneDraft.group_description });
      }
    }
    // 分配分组
    await batchAssignDomainGroup({ group_id: editingZoneDraft.group_id, ids: [row.id] });
    ElMessage.success("保存成功");
    editingZoneId.value = null;
    await loadZones();
  } catch (e) {
    ElMessage.error("保存失败");
  }
}

function cancelZoneEdit() {
  editingZoneId.value = null;
}

// --- Group upsert dialog ---
const showGroupDialog = ref(false);
const groupForm = reactive({ selectId: "" as string, name: "", description: "" });

function openGroupDialog() {
  groupForm.selectId = "";
  groupForm.name = "";
  groupForm.description = "";
  showGroupDialog.value = true;
}

function onGroupSelectChange(id: string) {
  const g = groups.value.find(x => x.id === id);
  if (g) {
    groupForm.name = g.name;
    groupForm.description = g.description || "";
  }
}

async function submitGroupUpsert() {
  if (!groupForm.name && !groupForm.selectId) {
    ElMessage.warning("请填写分组名或选择分组");
    return;
  }
  try {
    const payload: any = { name: groupForm.name, description: groupForm.description };
    if (groupForm.selectId) payload.id = groupForm.selectId;
    await createOrUpdateDomainGroup(payload);
    ElMessage.success("保存成功");
    showGroupDialog.value = false;
    await loadGroups();
  } catch (e) {
    ElMessage.error("保存失败");
  }
}

// --- Batch assign group dialog ---
const showBatchAssign = ref(false);
const batchAssign = reactive({ groupId: "", namesText: "" });

function openBatchAssignDialog() {
  batchAssign.groupId = "";
  // 以当前选中域名默认填充名称（如果 zones 数据包含 name）
  const currentNames = zones.value.filter(z => selectedZoneIds.value.includes(z.id)).map(z => z.name);
  batchAssign.namesText = currentNames.join(",");
  showBatchAssign.value = true;
}

async function submitBatchAssign() {
  if (!batchAssign.groupId) {
    ElMessage.warning("请选择分组");
    return;
  }
  try {
    const names = safeSplitAndFilter(batchAssign.namesText, ",");
    await batchAssignDomainGroup({ group_id: batchAssign.groupId, ids: selectedZoneIds.value, names });
    ElMessage.success("分配成功");
    showBatchAssign.value = false;
    await loadZones();
  } catch (e) {
    ElMessage.error("分配失败");
  }
}
</script>

<template>
  <div class="domain-management">
    <el-card shadow="never" class="zones-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('menus.domainManagement') }}</span>
          <div class="header-actions">
            <el-input v-model="zoneKeyword" :placeholder="$t('domain.searchDomainPlaceholder')" clearable
              style="width: 280px; margin-right: 8px;" />
            <el-select v-model="groupFilterId" clearable placeholder="分组筛选" style="width: 220px; margin-right: 8px;"
              @change="handleGroupFilterChange">
              <template #header>
                <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 8px;">
                  <span style="color: var(--el-text-color-secondary);">分组筛选</span>
                  <el-tooltip content="新增分组" placement="top">
                    <el-icon style="cursor:pointer" @click.stop="() => { handleGroupFilterChange('__ADD__') }">
                      <Plus />
                    </el-icon>
                  </el-tooltip>
                </div>
              </template>
              <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>
            <el-button @click="loadZones">{{ $t('domain.refresh') }}</el-button>
          </div>
        </div>
      </template>
      <div class="zones-toolbar" style="margin-bottom: 8px; display:flex; justify-content:flex-end; gap:8px;">
        <el-select v-model="batchDeleteType" clearable placeholder="按类型删除记录" style="width: 160px;">
          <el-option v-for="t in ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA']" :key="t" :label="t"
            :value="t" />
        </el-select>
        <el-button type="warning" :disabled="!batchDeleteType || selectedZoneIds.length === 0"
          @click="handleDeleteRecordsByType">删除所选域名该类型记录</el-button>
        <el-button type="primary" :disabled="selectedZoneIds.length === 0"
          @click="() => { showBatchCreate = true; }">批量新增记录</el-button>
        <el-button type="danger" :disabled="selectedZoneIds.length === 0"
          @click="handleBatchDeleteDomains">批量删除域名</el-button>
        <!-- <el-button @click="openGroupDialog">新增/更新分组</el-button> -->
        <el-button type="success" :disabled="selectedZoneIds.length === 0"
          @click="openBatchAssignDialog">批量分组</el-button>
      </div>
      <el-table :data="filteredZones" v-loading="loadingZones" border highlight-current-row @row-click="startZoneEdit"
        @selection-change="(rows: any[]) => { selectedZoneIds = rows.map(r => r.id) }">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="name" :label="$t('domain.domainName')" min-width="240" show-overflow-tooltip />
        <el-table-column prop="group_name" label="组名" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="editingZoneId === row.id">
              <el-select v-model="editingZoneDraft.group_id" filterable clearable size="small" style="width: 160px;">
                <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
              </el-select>
            </template>
            <template v-else>{{groups.find(g => g.id === row.group_id)?.name || '-'}}</template>
          </template>
        </el-table-column>
        <el-table-column prop="group_description" label="备注" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="editingZoneId === row.id">
              <el-input v-model="editingZoneDraft.group_description" size="small" />
            </template>
            <template v-else>{{ row.group_description || '-' }}</template>
          </template>
        </el-table-column>
        <el-table-column width="200" :label="$t('dns.actions')">
          <template #default="{ row }">
            <template v-if="editingZoneId === row.id">
              <el-button size="small" type="primary" @click.stop="saveZoneEdit(row)">保存</el-button>
              <el-button size="small" @click.stop="cancelZoneEdit">取消</el-button>
            </template>
            <template v-else>
              <el-button size="small" type="primary" @click.stop="openDnsDialog(row)">{{ $t('domain.manageDns')
              }}</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showDnsDialog" :title="`${$t('domain.manageDns')} - ${selectedZoneName}`" width="1080px"
      @closed="() => { editingRowId = null; selectedRecordIds = []; }">
      <div class="toolbar-row" style="margin-bottom: 12px;">
        <div class="left" style="flex: 1;">
          <el-input v-model="searchKeyword" :placeholder="$t('dns.searchRecordPlaceholder')" clearable
            style="width: 280px;" />
          <el-select v-model="filterType" clearable :placeholder="$t('dns.filterByType')"
            style="width: 160px; margin-left: 12px;">
            <el-option v-for="t in ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA']" :key="t" :label="t"
              :value="t" />
          </el-select>
          <el-button type="primary" :disabled="!selectedZoneId" @click="handleCreate" style="margin-left: 12px;">{{
            $t('dns.addRecord') }}</el-button>
          <el-button :disabled="!selectedZoneId" @click="loadRecords" style="margin-left: 8px;">{{ $t('dns.refresh')
          }}</el-button>
        </div>
        <div class="right"></div>
      </div>

      <el-table :data="filteredRecords" v-loading="loadingRecords" border @row-click="startRowEdit">
        <el-table-column :label="$t('dns.type')" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="editingRowId === row.id">
              <el-select v-model="editingDraft.type" size="small" style="width: 100px;">
                <el-option v-for="t in ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA']" :key="t" :label="t"
                  :value="t" />
              </el-select>
            </template>
            <template v-else>{{ row.type }}</template>
          </template>
        </el-table-column>
        <el-table-column :label="$t('dns.name')" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="editingRowId === row.id">
              <el-input v-model="editingDraft.name" size="small" />
            </template>
            <template v-else>{{ row.name }}</template>
          </template>
        </el-table-column>
        <el-table-column :label="$t('dns.content')" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="editingRowId === row.id">
              <el-input v-model="editingDraft.content" size="small" />
            </template>
            <template v-else>{{ row.content }}</template>
          </template>
        </el-table-column>
        <el-table-column :label="$t('dns.ttl')" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="editingRowId === row.id">
              <el-select v-model="editingDraft.ttl" size="small" style="width: 100px;">
                <el-option v-for="v in [60, 120, 300, 600, 1200, 3600]" :key="v" :label="v" :value="v" />
              </el-select>
            </template>
            <template v-else>{{ row.ttl }}</template>
          </template>
        </el-table-column>
        <el-table-column :label="$t('dns.proxy')" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="editingRowId === row.id">
              <el-switch v-model="editingDraft.proxied" @click.stop />
            </template>
            <template v-else>
              <el-tag :type="row.proxied ? 'success' : 'info'">{{ row.proxied ? 'ON' : 'OFF' }}</el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column :label="$t('dns.actions')" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="editingRowId === row.id">
              <el-button size="small" type="primary" @click.stop="saveRowEdit(row)">保存</el-button>
              <el-button size="small" @click.stop="editingRowId = null">取消</el-button>
            </template>
            <template v-else>
              <el-button size="small" type="danger" @click.stop="handleDelete(row)">{{ $t('dns.delete') }}</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="showDnsDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDialog" :title="editingRecord ? $t('dns.editRecord') : $t('dns.addRecord')" width="520px"
      @closed="resetForm">
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="90px">
        <el-form-item :label="$t('dns.type')" prop="type">
          <el-select v-model="formData.type" style="width: 160px">
            <el-option v-for="t in ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA']" :key="t" :label="t"
              :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('dns.name')" prop="name">
          <el-input v-model="formData.name" :placeholder="$t('dns.namePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('dns.content')" prop="content">
          <el-input v-model="formData.content" />
        </el-form-item>
        <el-form-item :label="$t('dns.ttl')" prop="ttl">
          <el-select v-model="formData.ttl" style="width: 160px">
            <el-option v-for="v in [60, 120, 300, 600, 1200, 3600]" :key="v" :label="v" :value="v" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('dns.proxy')" prop="proxied">
          <el-switch v-model="formData.proxied" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBatchCreate" title="批量新增记录" width="720px">
      <div style="margin-bottom: 8px; color: var(--el-text-color-secondary);">请粘贴 JSON 数组（记录字段：type, name, content, ttl,
        proxied）。</div>
      <el-input v-model="batchCreateText" type="textarea" :rows="12" />
      <template #footer>
        <el-button @click="showBatchCreate = false">取消</el-button>
        <el-button type="primary" @click="handleBatchCreateRecords">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showGroupDialog" title="新增/更新分组" width="520px">
      <el-form label-width="90px">
        <el-form-item label="选择分组">
          <el-select v-model="groupForm.selectId" clearable filterable placeholder="选择已有分组"
            @change="onGroupSelectChange">
            <el-option v-for="g in groups" :key="g.id" :value="g.id" :label="g.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="分组名">
          <el-input v-model="groupForm.name" placeholder="不选上面则按此新建" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="groupForm.description" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="submitGroupUpsert">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBatchAssign" title="域名批量分组" width="620px">
      <el-form label-width="90px">
        <el-form-item label="选择分组">
          <el-select v-model="batchAssign.groupId" filterable placeholder="选择目标分组">
            <el-option v-for="g in groups" :key="g.id" :value="g.id" :label="g.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="域名列表">
          <el-input v-model="batchAssign.namesText" type="textarea" :rows="6" placeholder="example.com,example.net" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchAssign = false">取消</el-button>
        <el-button type="primary" @click="submitBatchAssign">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.domain-management {
  .zones-card {
    margin-bottom: 12px;

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }

  .toolbar {
    margin-bottom: 12px;

    .toolbar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .left {
        display: flex;
        align-items: center;
      }

      .right>*:not(:first-child) {
        margin-left: 8px;
      }
    }
  }
}
</style>
