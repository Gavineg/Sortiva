import { calcStats, countGender, getStudentName, strongestSubject } from "./grouping.js";

export function renderStudentSelects(state, dom) {
    const options = [`<option value="">选择学生</option>`]
        .concat(state.students.map(s => `<option value="${s.id}">${s.name} (${s.gender})</option>`))
        .join("");
    dom.studentSelect1.innerHTML = options;
    dom.studentSelect2.innerHTML = options;
}

export function renderConstraints(state, dom) {
    if (!state.constraints.length) {
        dom.constraintsContainer.innerHTML = "<span class='summary'>暂无约束</span>";
        return;
    }
    const typeLabel = { must_together: "同组", must_separate: "分开", not_adjacent: "不相邻" };
    dom.constraintsContainer.innerHTML = state.constraints.map((c, i) => `
        <span class="chip">
            ${getStudentName(state.students, c.student1)} ${typeLabel[c.type]} ${getStudentName(state.students, c.student2)}
            <button data-remove-c="${i}">×</button>
        </span>
    `).join("");
}

export function renderPreview(state, dom) {
    if (!state.students.length) return;
    const subjects = Object.keys(state.students[0].scores || {});
    let html = "<table><thead><tr><th>姓名</th><th>性别</th>";
    subjects.forEach(s => html += `<th>${s}</th>`);
    html += "<th>总分</th></tr></thead><tbody>";
    state.students.forEach(st => {
        html += `<tr><td>${st.name}</td><td>${st.gender}</td>`;
        subjects.forEach(s => html += `<td>${st.scores[s] ?? ""}</td>`);
        html += `<td>${st.totalScore.toFixed(2)}</td></tr>`;
    });
    html += "</tbody></table>";
    dom.dataPreview.innerHTML = html;
    dom.dataPreview.classList.remove("hidden");
}

export function renderGroups(state, dom) {
    dom.resultsContainer.innerHTML = state.groups.map((group, idx) => `
        <article class="group-card" data-group-index="${idx}">
            <div class="group-header" draggable="true">
                <span>第${idx + 1}组 (${group.length}人)</span>
                <span class="drag-handle">☰</span>
            </div>
            <div class="group-stats">
                <div>均分 ${avg(group).toFixed(2)}</div>
                <div>男 ${countGender(group, "男")} / 女 ${countGender(group, "女")}</div>
                <div>优势 ${strongestSubject(group)}</div>
                <div>组序 ${idx + 1}</div>
            </div>
            <div class="group-members">
                ${group.map(s => `
                    <div class="student-item" draggable="true" data-student-id="${s.id}">
                        <span class="drag-handle">☰</span>
                        <span>${s.name}</span>
                        <span>${s.totalScore.toFixed(2)}</span>
                    </div>
                `).join("")}
            </div>
        </article>
    `).join("");
}

function avg(group) {
    return group.reduce((sum, s) => sum + s.totalScore, 0) / (group.length || 1);
}

export function renderQuality(state, dom) {
    const s = calcStats(state.groups);
    dom.qualityPanel.innerHTML = `
        <div class="quality-item"><div>组间平均分差</div><div class="qv">${s.scoreDiff.toFixed(2)}</div></div>
        <div class="quality-item"><div>性别平衡波动</div><div class="qv">${s.genderBalance.toFixed(2)}</div></div>
        <div class="quality-item"><div>科目多样性</div><div class="qv">${s.subjectDiversity.toFixed(2)}</div></div>
        <div class="quality-item"><div>综合评分</div><div class="qv">${s.overallQuality.toFixed(2)}</div></div>
    `;
}
