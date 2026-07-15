import { dom } from "./dom.js";
import { state } from "./state.js";
import { initLiveFitnessChart, pushLiveFitness, renderAllCharts } from "./charts.js";
import { wireGroupOrderDrag, wireMemberDrag } from "./drag.js";
import { exportAnalysis, exportComparison, exportResults } from "./exporter.js";
import { buildConfig, runGrouping } from "./grouping.js";
import { detectHeaderAndMapping, extractManualMapping, mergeGenderFile, parseStudents, populateMappingSelectors, readExcelRows, runImportAnimation } from "./importer.js";
import { renderConstraints, renderGroups, renderPreview, renderQuality, renderStudentSelects } from "./renderer.js";
import { bindTab, bindValueEcho, hideProgress, showProgress, showScreen, toast, updateGroupHint } from "./ui.js";

let dragBound = false;

function refreshResultsUI() {
    state.manualAdjust = true;
    state.groupOrderMode = true;
    renderGroups(state, dom);
    renderQuality(state, dom);
    wireMemberDrag(state, dom, () => { refreshResultsUI(); renderAllCharts(state, dom); });
}

function afterStudentsReady() {
    renderStudentSelects(state, dom);
    renderConstraints(state, dom);
    dom.importSummary.classList.remove("hidden");
    dom.importSummaryText.textContent = "\u5DF2\u51C6\u5907 " + state.students.length + " \u540D\u5B66\u751F";
    dom.previewDataBtn.disabled = false;
    dom.toConfigBtn.disabled = false;
    updateGroupHint(dom, state.students.length);
    toast(dom, "\u6210\u529F\u5BFC\u5165 " + state.students.length + " \u540D\u5B66\u751F\u6570\u636E", "success");
}

async function importScoreFile(file) {
    await runImportAnimation(dom, async () => {
        state.rawRows = await readExcelRows(file);
        const meta = detectHeaderAndMapping(state.rawRows);
        state.parsedMeta = meta;
        state.headers = meta.headers;
        if (meta.needManual) {
            populateMappingSelectors(meta.headers, meta.mapping, dom);
            dom.mappingPanel.classList.remove("hidden");
            toast(dom, "\u8BF7\u624B\u52A8\u786E\u8BA4\u5217\u6620\u5C04", "info");
            return;
        }
        state.students = parseStudents(state.rawRows, meta.headerIndex, meta.mapping);
        afterStudentsReady();
        if (meta.mapping.genderCol < 0) {
            dom.genderStandaloneBox.classList.remove("hidden");
            toast(dom, "\u672A\u68C0\u6D4B\u5230\u6027\u522B\u5217\uFF0C\u53EF\u5355\u72EC\u5BFC\u5165", "info");
        }
    });
}

function validateBeforeStart() {
    if (!state.students.length) { toast(dom, "\u8BF7\u5148\u5BFC\u5165\u6570\u636E", "error"); return false; }
    const cfg = buildConfig(dom);
    if (cfg.groupSize < 2 || cfg.groupSize > 20) { toast(dom, "\u6BCF\u7EC4\u4EBA\u6570\u9700\u8981\u5728 2-20 \u4E4B\u95F4", "error"); return false; }
    if (cfg.minMales + cfg.minFemales > cfg.groupSize) { toast(dom, "\u6BCF\u7EC4\u6700\u5C11\u7537\u5973\u4EBA\u6570\u4E4B\u548C\u4E0D\u80FD\u8D85\u8FC7\u6BCF\u7EC4\u4EBA\u6570", "error"); return false; }
    return true;
}

function onGroupingTick(tick) {
    const percent = Math.round((tick.gen / tick.max) * 100);
    dom.groupingProgressFill.style.width = percent + "%";
    dom.groupingProgressText.textContent = "\u5206\u7EC4\u8FDB\u884C\u4E2D " + percent + "%";
    dom.generationInfo.textContent = tick.gen + " / " + tick.max;
    if (tick.gen % 2 === 0) pushLiveFitness(state, tick.gen, tick.bestFitness);
}

function onGroupingDone(res) {
    state.groups = res.groups;
    state.fitnessHistory = res.fitnessHistory;
    hideProgress(dom);
    refreshResultsUI();
    renderAllCharts(state, dom);
    showScreen(dom, "results");
    toast(dom, "\u5206\u7EC4\u5B8C\u6210\uFF01", "success");
}

function bindImportEvents() {
    dom.fileUploadArea.addEventListener("click", () => dom.scoreFileInput.click());
    dom.fileUploadArea.addEventListener("dragover", e => { e.preventDefault(); dom.fileUploadArea.classList.add("drag-over"); });
    dom.fileUploadArea.addEventListener("dragleave", () => { dom.fileUploadArea.classList.remove("drag-over"); });
    dom.fileUploadArea.addEventListener("drop", async e => {
        e.preventDefault(); dom.fileUploadArea.classList.remove("drag-over");
        const f = e.dataTransfer.files?.[0]; if (f) await importScoreFile(f);
    });
    dom.scoreFileInput.addEventListener("change", async () => { const file = dom.scoreFileInput.files?.[0]; if (file) await importScoreFile(file); });
    dom.previewDataBtn.addEventListener("click", () => renderPreview(state, dom));
    dom.toConfigBtn.addEventListener("click", () => { if (!state.students.length) { toast(dom, "\u8BF7\u5148\u5BFC\u5165\u6570\u636E", "error"); return; } showScreen(dom, "config"); });
    dom.mergeGenderBtn.addEventListener("click", async () => {
        const file = dom.genderFileInput.files?.[0]; if (!file) return;
        const merged = await mergeGenderFile(file);
        toast(dom, "\u5DF2\u66F4\u65B0 " + merged + " \u6761\u6027\u522B\u4FE1\u606F", "success");
        afterStudentsReady();
    });
}

function bindMappingEvents() {
    dom.applyMappingBtn.addEventListener("click", () => {
        if (!state.rawRows.length || !state.parsedMeta) return;
        const mapping = extractManualMapping(dom);
        if (mapping.nameCol < 0 || mapping.subjectCols.length === 0) { toast(dom, "\u59D3\u540D\u5217\u548C\u81F3\u5C11\u4E00\u4E2A\u79D1\u76EE\u5217\u662F\u5FC5\u987B\u9879", "error"); return; }
        state.students = parseStudents(state.rawRows, state.parsedMeta.headerIndex, mapping);
        afterStudentsReady();
        dom.mappingPanel.classList.add("hidden");
        if (mapping.genderCol < 0) dom.genderStandaloneBox.classList.remove("hidden");
    });
}

function bindConfigEvents() {
    dom.modeCards.forEach(card => {
        card.addEventListener("click", () => {
            dom.modeCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            dom.groupMode.value = card.dataset.mode;
            dom.weightCard.classList.toggle("hidden", card.dataset.mode !== "custom");
        });
    });
    document.querySelectorAll(".stepper-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = document.getElementById(btn.dataset.target);
            if (!target) return;
            const dir = parseFloat(btn.dataset.dir);
            const newVal = parseFloat(target.value) + dir;
            if (newVal >= parseFloat(target.min) && newVal <= parseFloat(target.max)) {
                target.value = newVal;
                target.dispatchEvent(new Event("change"));
            }
            updateGroupHint(dom, state.students.length);
        });
    });
    dom.genderConstraintToggle.addEventListener("change", () => {
        dom.genderConstraintBody.classList.toggle("hidden", !dom.genderConstraintToggle.checked);
    });
    dom.groupSize.addEventListener("change", () => updateGroupHint(dom, state.students.length));
    dom.addConstraintBtn.addEventListener("click", () => {
        const s1 = Number(dom.studentSelect1.value), s2 = Number(dom.studentSelect2.value);
        if (!s1 || !s2 || s1 === s2) { toast(dom, "\u8BF7\u9009\u62E9\u4E24\u4E2A\u4E0D\u540C\u7684\u5B66\u751F", "error"); return; }
        const type = dom.constraintType.value;
        if (state.constraints.some(c => ((c.student1===s1&&c.student2===s2)||(c.student1===s2&&c.student2===s1))&&c.type===type)) return;
        state.constraints.push({ student1: s1, student2: s2, type });
        renderConstraints(state, dom);
    });
    dom.clearConstraintsBtn.addEventListener("click", () => { state.constraints = []; renderConstraints(state, dom); });
    dom.backToImportBtn.addEventListener("click", () => showScreen(dom, "import"));
    dom.startGroupingBtn.addEventListener("click", () => {
        if (!validateBeforeStart()) return;
        state.fitnessHistory = [];
        initLiveFitnessChart(state, dom);
        dom.groupingProgressFill.style.width = "0%";
        dom.groupingProgressText.textContent = "\u521D\u59CB\u5316\u4E2D...";
        showProgress(dom);
        runGrouping(state.students, buildConfig(dom), state.constraints, onGroupingTick, onGroupingDone);
    });
}

function bindResultEvents() {
    dom.regroupBtn.addEventListener("click", () => dom.startGroupingBtn.click());
    dom.exportResultsBtn.addEventListener("click", () => { exportResults(state.groups, "full"); toast(dom, "\u5DF2\u5BFC\u51FA\u5206\u7EC4\u7ED3\u679C", "success"); });
    dom.exportAnalysisBtn.addEventListener("click", () => { exportAnalysis(state.groups, state.students); toast(dom, "\u5DF2\u5BFC\u51FA\u5206\u6790\u62A5\u544A", "success"); });
    dom.exportComparisonBtn.addEventListener("click", () => { exportComparison(state.groups); toast(dom, "\u5DF2\u5BFC\u51FA\u5BF9\u6BD4\u6570\u636E", "success"); });
}

function bindNavEvents() {
    dom.stepPills.forEach(pill => {
        pill.addEventListener("click", () => {
            const target = pill.dataset.step;
            if (target === "config" && !state.students.length) { toast(dom, "\u8BF7\u5148\u5BFC\u5165\u6570\u636E", "error"); return; }
            if (target === "results" && !state.groups.length) { toast(dom, "\u8BF7\u5148\u5B8C\u6210\u5206\u7EC4", "error"); return; }
            showScreen(dom, target);
        });
    });
}

function bindTheme() {
    const saved = localStorage.getItem("gd-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    dom.themeToggle.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "light" ? "" : "light";
        if (next) document.documentElement.setAttribute("data-theme", next);
        else document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("gd-theme", next);
    });
}

function init() {
    bindTheme();
    bindValueEcho(dom);
    bindTab(dom, state, tab => { if (tab !== "groups") renderAllCharts(state, dom); });
    bindNavEvents();
    bindImportEvents();
    bindMappingEvents();
    bindConfigEvents();
    bindResultEvents();
    renderConstraints(state, dom);
    dom.constraintsContainer.addEventListener("click", e => {
        const target = e.target.closest("[data-remove-c]");
        if (!target) return;
        state.constraints.splice(Number(target.dataset.removeC), 1);
        renderConstraints(state, dom);
    });
    showScreen(dom, "import");
    // Disclaimer popup - auto close after 5s or on click
    const overlay = document.getElementById("disclaimerOverlay");
    if (overlay) {
        const closeDisclaimer = () => {
            overlay.style.animation = "fadeOut 0.4s ease forwards";
            setTimeout(() => overlay.classList.add("hidden"), 400);
        };
        overlay.addEventListener("click", closeDisclaimer);
        setTimeout(closeDisclaimer, 5000);
    }
}

init();
