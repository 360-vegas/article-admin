<script setup lang="ts">
import { onMounted, reactive, ref, computed } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, ElNotification, FormInstance, FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { safeSplitAndFilter } from "@/utils/safeSplit";
import {
  getCloudflareZones,
  getDnsRecords,
  createDnsRecord,
  updateDnsRecord,
  updateDnsRecordsBatch,
  deleteDnsRecord,
  deleteDnsRecordsByType,
  deleteDnsRecordsBatch,
  deleteLocalDomainsBatch,
  createDnsRecordsBatch,
  deleteDnsRecordsByTypeAcrossZones,
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

const progress = reactive({ visible: false, total: 0, done: 0, success: 0, skipped: 0, failed: 0 });
const progressPercent = computed(() => (progress.total ? Math.round((progress.done / progress.total) * 100) : 0));
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function isSkipError(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("already exists") || m.includes("81054") || m.includes("records with same name") || m.includes("same name");
}
function extractErrorMessage(e: any): string {
  const r = e?.response;
  const d = r?.data;
  if (typeof d === "string") return d;
  if (d?.message) return String(d.message);
  if (d?.error) return String(d.error);
  if (Array.isArray(d?.errors)) return d.errors.map((x: any) => (x?.message || x)).join("; ");
  return e?.message || "Internal Server Error";
}
function toFqdn(name: string, zone: string) {
  const n = (name || "").trim();
  const z = (zone || "").trim();
  if (!n) return n;
  const lower = n.toLowerCase();
  const zl = z.toLowerCase();
  if (lower === "@") return z;
  if (lower === "*") return `*.${z}`;
  if (lower.endsWith(`.${zl}`)) return n;
  if (lower.includes(".")) return n;
  return `${n}.${z}`;
}
function namesMatch(desiredName: string, cfName: string, zone: string) {
  const a = toFqdn(desiredName, zone).toLowerCase();
  const b = toFqdn(cfName || "", zone).toLowerCase();
  return a === b;
}
function findDesiredInChunk(rc: any[], recName: string, zoneName: string) {
  const target = toFqdn(recName, zoneName).toLowerCase();
  return rc.find(r => toFqdn(r?.name || "", zoneName).toLowerCase() === target);
}
const autoModifyOnDuplicate = ref(true);
const zoneRecordsCache = new Map<string, DnsRecord[]>();

async function handleDuplicateUpdate(zoneId: string, desired: { type: string; name: string; content: string; ttl: number; proxied: boolean; }): Promise<boolean> {
  try {
    let list = zoneRecordsCache.get(zoneId);
    if (!list) {
      const res = await getDnsRecords(zoneId);
      list = res.data || [];
      zoneRecordsCache.set(zoneId, list);
    }
    const zoneName = zones.value.find(z => z.id === zoneId)?.name || "";
    const sameName = (list || []).filter(r => namesMatch(desired.name, r.name, zoneName));
    const desiredType = (desired.type || "").toUpperCase();
    if (desiredType === "CNAME") {
      const toDelete = sameName.filter(r => (r.type || "").toUpperCase() !== "CNAME");
      for (const r of toDelete) { await deleteDnsRecord(zoneId, r.id); }
      const cnameExisting = sameName.filter(r => (r.type || "").toUpperCase() === "CNAME");
      if (cnameExisting.length) {
        await updateDnsRecord(zoneId, cnameExisting[0].id, { content: desired.content, ttl: desired.ttl, proxied: desired.proxied });
      } else {
        await createDnsRecord(zoneId, { ...desired });
      }
      zoneRecordsCache.delete(zoneId);
      return true;
    } else {
      const cnameExisting = sameName.filter(r => (r.type || "").toUpperCase() === "CNAME");
      for (const r of cnameExisting) { await deleteDnsRecord(zoneId, r.id); }
      const sameType = sameName.filter(r => (r.type || "").toUpperCase() === desiredType);
      if (sameType.length) {
        await updateDnsRecord(zoneId, sameType[0].id, { content: desired.content, ttl: desired.ttl, proxied: desired.proxied });
      } else {
        await createDnsRecord(zoneId, { ...desired });
      }
      zoneRecordsCache.delete(zoneId);
      return true;
    }
  } catch (e) {
    return false;
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

const batchCreateRules: FormRules = {
  domains: [{ required: true, message: "请输入域名或 Zone ID 列表", trigger: "blur" }],
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

// 批量新增记录
const showBatchCreate = ref(false);
const batchCreateForm = reactive({
  domains: "", // 多个域名，逗号或换行分隔
  type: "A",
  name: "", // DNS记录名称（主机名）
  content: "",
  ttl: 300,
  proxied: false
});
const batchCreateFormRef = ref<FormInstance | null>(null);
const batchSubmitting = ref(false);

function chunk<T>(arr: T[], size: number) {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

async function handleBatchCreateRecords() {
  if (!batchCreateFormRef.value) return;
  const valid = await batchCreateFormRef.value.validate();
  if (!valid) return;

  try {
    batchSubmitting.value = true;
    // 解析域名或 Zone ID 列表
    const inputList = safeSplitAndFilter(batchCreateForm.domains, /[,\n]/);
    if (inputList.length === 0) {
      ElMessage.warning("请至少输入一个域名或 Zone ID");
      return;
    }

    // 先确保域名列表已加载
    if (zones.value.length === 0) {
      ElMessage.warning("正在加载域名列表，请稍后再试");
      await loadZones();
      if (zones.value.length === 0) {
        ElMessage.error("无法获取域名列表，请刷新页面");
        return;
      }
    }

    // 智能处理输入：判断是域名还是 Zone ID
    const zoneIds: string[] = [];
    const notFoundDomains: string[] = [];

    for (const input of inputList) {
      const trimmedInput = input.trim();

      // 判断是否为 Zone ID（32位十六进制字符串）
      if (/^[a-f0-9]{32}$/i.test(trimmedInput)) {
        // 直接作为 Zone ID 使用
        zoneIds.push(trimmedInput);
      } else {
        // 作为域名处理，查找对应的 Zone ID
        const zone = zones.value.find(z =>
          z.name.toLowerCase() === trimmedInput.toLowerCase()
        );

        if (zone) {
          zoneIds.push(zone.id);
        } else {
          notFoundDomains.push(trimmedInput);
        }
      }
    }

    // 如果有未找到的域名，提示用户
    if (notFoundDomains.length > 0) {
      const domainList = notFoundDomains.length > 5
        ? notFoundDomains.slice(0, 5).join('\n') + `\n... 还有 ${notFoundDomains.length - 5} 个域名`
        : notFoundDomains.join('\n');

      ElNotification({
        title: '域名未找到',
        message: `以下域名未在当前系统中找到：\n${domainList}\n\n请确认：\n1. 域名是否已添加到 Cloudflare\n2. 您是否有权限管理这些域名\n3. 或点击刷新按钮更新域名列表`,
        type: 'warning',
        duration: 15000,
        position: 'top-right'
      });

      if (zoneIds.length === 0) {
        ElMessage.error('没有有效的域名可以执行操作');
        return;
      }

      // 即使有部分域名未找到，仍继续为已找到的域名添加记录
      ElMessage.info(`将为 ${zoneIds.length} 个域名添加记录`);
    }

    // 解析主机名列表（支持多个主机名）
    const hostnames = safeSplitAndFilter(batchCreateForm.name, /[,，\s]+/);
    if (hostnames.length === 0) {
      ElMessage.warning("请输入至少一个主机名");
      return;
    }

    // 为每个主机名创建记录
    const records = hostnames.map(hostname => ({
      type: batchCreateForm.type,
      name: hostname.trim(),
      content: batchCreateForm.content,
      ttl: batchCreateForm.ttl,
      proxied: batchCreateForm.proxied
    }));

    progress.visible = true;
    progress.total = zoneIds.length * records.length;
    progress.done = 0;
    progress.success = 0;
    progress.skipped = 0;
    progress.failed = 0;

    const zoneChunks = chunk(zoneIds, 16);
    const failedDetails: string[] = [];
    const skippedDetails: string[] = [];

    async function processZone(zoneId: string) {
      const domainName = zones.value.find(z => z.id === zoneId)?.name || zoneId;
      let list = zoneRecordsCache.get(zoneId);
      if (!list) {
        const res = await getDnsRecords(zoneId);
        list = res.data || [];
        zoneRecordsCache.set(zoneId, list);
      }
      const deletes: string[] = [];
      const updates: { id: string; content: string; ttl: number; proxied: boolean }[] = [];
      const creates: { type: string; name: string; content: string; ttl: number; proxied: boolean }[] = [];
      for (const rec of records) {
        const sameName = (list || []).filter(r => namesMatch(rec.name, r.name, domainName));
        const desiredType = (rec.type || "").toUpperCase();
        const sameType = sameName.find(r => (r.type || "").toUpperCase() === desiredType);
        const cnameConflict = sameName.find(r => (r.type || "").toUpperCase() === "CNAME" && desiredType !== "CNAME");
        const otherConflict = sameName.find(r => (r.type || "").toUpperCase() !== desiredType && (r.type || "").toUpperCase() !== "CNAME" && desiredType === "CNAME");
        if (sameType) {
          const needUpdate = sameType.content !== rec.content || sameType.ttl !== rec.ttl || !!sameType.proxied !== !!rec.proxied;
          if (needUpdate) updates.push({ id: sameType.id, content: rec.content, ttl: rec.ttl, proxied: rec.proxied });
          else { progress.skipped++; progress.done++; }
        } else if (autoModifyOnDuplicate.value && (cnameConflict || otherConflict)) {
          const toDel = sameName.map(r => r.id);
          for (const id of toDel) deletes.push(id);
          creates.push(rec);
        } else if (sameName.length > 0 && isSkipError("already exists")) {
          progress.skipped++;
          progress.done++;
          skippedDetails.push(`${domainName} - ${rec.name}: already exists`);
        } else {
          creates.push(rec);
        }
      }

      const delChunks = chunk(deletes, 50);
      for (const dc of delChunks) {
        if (dc.length === 0) continue;
        try { await deleteDnsRecordsBatch(zoneId, dc); } catch (e) {
          for (const id of dc) { try { await deleteDnsRecord(zoneId, id); } catch (_) { } }
        }
      }

      const updChunks = chunk(updates, 20);
      for (const uc of updChunks) {
        if (uc.length === 0) continue;
        try {
          await updateDnsRecordsBatch(zoneId, uc);
          progress.success += uc.length;
          progress.done += uc.length;
        } catch (e) {
          for (const u of uc) {
            try { await updateDnsRecord(zoneId, u.id, { content: u.content, ttl: u.ttl, proxied: u.proxied }); progress.success++; }
            catch (er) { progress.failed++; failedDetails.push(`${domainName} - ${u.id}: ${extractErrorMessage(er)}`); }
            finally { progress.done++; await sleep(30); }
          }
        }
      }

      const crtChunks = chunk(creates, 20);
      for (const cc of crtChunks) {
        if (cc.length === 0) continue;
        try {
          await createDnsRecordsBatch(zoneId, cc);
          progress.success += cc.length;
          progress.done += cc.length;
        } catch (e) {
          for (const c of cc) {
            try { await createDnsRecord(zoneId, c); progress.success++; }
            catch (er) {
              const em = extractErrorMessage(er);
              if (isSkipError(em) && autoModifyOnDuplicate.value) {
                const ok = await handleDuplicateUpdate(zoneId, c);
                if (ok) progress.success++; else { progress.failed++; failedDetails.push(`${domainName} - ${c.name}: ${em}`); }
              } else if (isSkipError(em)) { progress.skipped++; skippedDetails.push(`${domainName} - ${c.name}: ${em}`); }
              else { progress.failed++; failedDetails.push(`${domainName} - ${c.name}: ${em}`); }
            }
            finally { progress.done++; await sleep(30); }
          }
        }
      }
      zoneRecordsCache.delete(zoneId);
    }

    for (const zc of zoneChunks) {
      await Promise.all(zc.map(z => processZone(z)));
      await sleep(120);
    }
    // 最终汇总基于进度计数与细节数组
    const totalSuccess = progress.success;
    const totalFailed = progress.failed;
    const totalSkipped = progress.skipped;
    if (totalSuccess > 0 && totalFailed === 0) {
      if (totalSkipped > 0) {
        ElNotification({
          title: '完成',
          message: `成功 ${totalSuccess} 条，跳过 ${totalSkipped} 条`,
          type: 'success',
          duration: 6000,
          position: 'top-right'
        });
      } else {
        ElMessage.success(`成功创建 ${totalSuccess} 条记录`);
      }
    } else if (totalSuccess > 0 && totalFailed > 0) {
      ElNotification({
        title: '操作部分成功',
        message: `成功 ${totalSuccess} 条，跳过 ${totalSkipped} 条，失败 ${totalFailed} 条`,
        type: 'warning',
        duration: 8000,
        position: 'top-right'
      });
    }
    if (totalFailed > 0) {
      if (failedDetails.length > 3) {
        ElNotification({
          title: '部分记录创建失败',
          message: `<div style="max-height: 300px; overflow-y: auto;">\
            <p>共有 ${totalFailed} 条记录创建失败：</p>\
            <ul style="margin: 5px 0; padding-left: 20px;">\
              ${failedDetails.map(detail => `<li style=\"margin: 3px 0;\">${detail}</li>`).join('')}\
            </ul>\
          </div>`,
          type: 'error',
          duration: 15000,
          position: 'top-right',
          dangerouslyUseHTMLString: true
        });
      } else {
        failedDetails.forEach(detail => { ElMessage.error(detail); });
      }
    }
    if (totalSkipped > 0 && skippedDetails.length > 0 && skippedDetails.length <= 3) {
      skippedDetails.forEach(detail => { ElMessage.info(`跳过：${detail}`); });
    }

    progress.visible = false;
    showBatchCreate.value = false;
    resetBatchCreateForm();
    // 如果当前正在查看某个域名的记录，检查是否需要刷新
    if (selectedZoneId.value && zoneIds.includes(selectedZoneId.value)) {
      await loadRecords();
    }
  } catch (e: any) {
    ElMessage.error(e.message || "创建失败");
  } finally {
    progress.visible = false;
    batchSubmitting.value = false;
  }
}

function resetBatchCreateForm() {
  Object.assign(batchCreateForm, {
    domains: "",
    type: "A",
    name: "",
    content: "",
    ttl: 300,
    proxied: false
  });
  batchCreateFormRef.value?.resetFields();
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
        <el-button type="primary" @click="() => { showBatchCreate = true; }">跨域名批量新增记录</el-button>
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

    <el-dialog v-model="showBatchCreate" title="批量新增记录（跨域名）" width="680px" @closed="resetBatchCreateForm"
      :close-on-click-modal="!batchSubmitting" :close-on-press-escape="!batchSubmitting">
      <div style="margin-bottom: 12px; color: var(--el-text-color-secondary);">
        为多个域名批量添加相同的DNS记录。支持同时创建多个主机名记录。<br>
        <strong>提示：</strong>请输入已添加到 Cloudflare 的域名，或直接输入 Zone ID。<br>
        示例：为 example1.com 和 example2.com 同时添加 @（根域名）和 www 的 A 记录。
      </div>
      <el-form ref="batchCreateFormRef" :model="batchCreateForm" :rules="batchCreateRules" label-width="100px">
        <el-form-item label="域名/Zone ID" prop="domains">
          <el-input v-model="batchCreateForm.domains" type="textarea" :rows="5"
            placeholder="请输入域名或Zone ID，每行一个或用逗号分隔&#10;例如：&#10;example1.com&#10;example2.com&#10;test.com,demo.com" />
        </el-form-item>
        <el-form-item :label="$t('dns.name')" prop="name">
          <el-input v-model="batchCreateForm.name" placeholder="主机名，支持多个（逗号或空格分隔），如：@ www * api" />
        </el-form-item>
        <el-form-item :label="$t('dns.type')" prop="type">
          <el-select v-model="batchCreateForm.type" style="width: 160px">
            <el-option v-for="t in ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA']" :key="t" :label="t"
              :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('dns.content')" prop="content">
          <el-input v-model="batchCreateForm.content" placeholder="例如：1.2.3.4" />
        </el-form-item>
        <el-form-item :label="$t('dns.ttl')" prop="ttl">
          <el-select v-model="batchCreateForm.ttl" style="width: 160px">
            <el-option v-for="v in [60, 120, 300, 600, 1200, 3600]" :key="v" :label="v" :value="v" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('dns.proxy')" prop="proxied">
          <el-switch v-model="batchCreateForm.proxied" />
        </el-form-item>
      </el-form>
      <div v-if="progress.visible"
        style="margin-top: 8px; padding: 10px; border: 1px solid var(--el-border-color); border-radius: 6px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <el-progress :percentage="progressPercent"
            :status="progress.failed > 0 ? 'exception' : (progress.done === progress.total ? 'success' : undefined)"
            style="flex:1" />
          <span style="white-space:nowrap;">{{ progress.done }} / {{ progress.total }}</span>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <el-tag type="success">成功 {{ progress.success }}</el-tag>
          <el-tag type="warning">跳过 {{ progress.skipped }}</el-tag>
          <el-tag type="danger">失败 {{ progress.failed }}</el-tag>
        </div>
      </div>
      <template #footer>
        <el-button :disabled="batchSubmitting" @click="showBatchCreate = false">取消</el-button>
        <el-button type="primary" :loading="batchSubmitting" :disabled="batchSubmitting"
          @click="handleBatchCreateRecords">提交</el-button>
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

/* 未注册域名通知框的自定义样式 */
:deep(.unregistered-domains-notification) {
  .el-notification__content {
    white-space: pre-line;
    font-size: 14px;
  }

  .el-notification__title {
    font-weight: bold;
  }
}

/* 错误详情列表样式 */
:deep(.el-notification__content) {
  ul {
    list-style-type: disc;

    li {
      font-size: 13px;
      line-height: 1.6;
      word-break: break-all;
    }
  }
}
</style>
