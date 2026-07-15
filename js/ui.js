import { state } from "./state.js";

const SCREENS = ["import", "config", "results"];

export function showScreen(dom, screen) {
    state.currentScreen = screen;
    dom.screens.forEach(sec => sec.classList.toggle("active", sec.dataset.screen === screen));
    dom.stepPills.forEach(pill => {
        const idx = SCREENS.indexOf(pill.dataset.step);
        const currentIdx = SCREENS.indexOf(screen);
        pill.classList.remove("active", "completed");
        if (pill.dataset.step === screen) pill.classList.add("active");
        else if (idx < currentIdx) pill.classList.add("completed");
    });
    // Hide progress overlay when switching screens
    if (screen !== "progress") dom.progressOverlay.classList.add("hidden");
}

export function showProgress(dom) {
    dom.progressOverlay.classList.remove("hidden");
}

export function hideProgress(dom) {
    dom.progressOverlay.classList.add("hidden");
}

export function bindTab(dom, state, onSwitch) {
    dom.tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            state.currentTab = tab;
            dom.tabButtons.forEach(b => b.classList.toggle("active", b === btn));
            dom.tabPanels.forEach(p => p.classList.toggle("active", p.id === `tab-${tab}`));
            onSwitch?.(tab);
        });
    });
}

export function bindValueEcho(dom) {
    const sync = () => {
        if (dom.genderRatioValue) dom.genderRatioValue.textContent = `${dom.genderRatio.value}%`;
        if (dom.scoreWeightValue) dom.scoreWeightValue.textContent = `${dom.scoreWeight.value}%`;
        if (dom.diversityWeightValue) dom.diversityWeightValue.textContent = `${dom.diversityWeight.value}%`;
        if (dom.mutationRateValue) dom.mutationRateValue.textContent = `${dom.mutationRate.value}%`;
    };
    ["input", "change"].forEach(evt => {
        dom.genderRatio?.addEventListener(evt, sync);
        dom.scoreWeight?.addEventListener(evt, sync);
        dom.diversityWeight?.addEventListener(evt, sync);
        dom.mutationRate?.addEventListener(evt, sync);
    });
    sync();
}

export function toast(dom, message, type = "info") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    dom.toastContainer.appendChild(el);
    setTimeout(() => {
        el.classList.add("exit");
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

export function updateGroupHint(dom, studentCount) {
    const size = Number(dom.groupSize.value) || 5;
    const groups = Math.ceil(studentCount / size);
    dom.groupCountHint.textContent = studentCount ? `将分为 ${groups} 组` : "将分为 ? 组";
}
