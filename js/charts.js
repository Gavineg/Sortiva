import { calcStats } from "./grouping.js";

function destroy(chart) {
    if (chart) chart.destroy();
}

export function initLiveFitnessChart(state, dom) {
    destroy(state.liveChart);
    state.liveChart = new Chart(dom.liveFitnessChart.getContext("2d"), {
        type: "line",
        data: { labels: [], datasets: [{ label: "拟合度", data: [], borderColor: "#55b8ff", backgroundColor: "rgba(85,184,255,.16)", tension: 0.25 }] },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.4,
            resizeDelay: 120,
            animation: false,
            plugins: { legend: { display: false } }
        }
    });
}

export function pushLiveFitness(state, gen, fitness) {
    if (!state.liveChart) return;
    const data = state.liveChart.data;
    data.labels.push(gen);
    data.datasets[0].data.push(fitness);
    if (data.labels.length > 120) {
        data.labels.shift();
        data.datasets[0].data.shift();
    }
    state.liveChart.update("none");
}

export function renderAllCharts(state, dom) {
    if (!state.students.length || !state.groups.length) return;
    renderInsightCards(state, dom);
    renderStudentDetailTable(state, dom);
    renderGroupScoreTable(state, dom);
    renderGroupDetailFold(state, dom);
    renderScoreDist(state, dom);
    renderGenderPie(state, dom);
    renderQualityRadar(state, dom);
    renderGroupCompare(state, dom);
    renderSubjectHeatmap(state, dom);
    renderGroupTotalTrend(state, dom);
    renderConvergence(state, dom);
}

function renderScoreDist(state, dom) {
    destroy(state.charts.scoreDistribution);
    const scores = state.students.map(s => s.totalScore);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const bins = Math.max(5, Math.min(10, Math.ceil(scores.length / 4)));
    const step = (max - min || 1) / bins;
    const ys = Array.from({ length: bins }, () => 0);
    scores.forEach(s => {
        const idx = Math.min(bins - 1, Math.floor((s - min) / step));
        ys[idx]++;
    });
    const labels = ys.map((_, i) => `${(min + i * step).toFixed(0)}-${(min + (i + 1) * step).toFixed(0)}`);
    state.charts.scoreDistribution = new Chart(dom.scoreDistributionChart.getContext("2d"), {
        type: "bar",
        data: { labels, datasets: [{ data: ys, backgroundColor: "rgba(67,150,255,.68)" }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderGenderPie(state, dom) {
    destroy(state.charts.genderRatio);
    const male = state.students.filter(s => s.gender === "男").length;
    const female = state.students.filter(s => s.gender === "女").length;
    const unknown = state.students.length - male - female;
    state.charts.genderRatio = new Chart(dom.genderRatioChart.getContext("2d"), {
        type: "pie",
        data: { labels: ["男", "女", "未知"], datasets: [{ data: [male, female, unknown], backgroundColor: ["#4da4ff", "#ff6f7f", "#8c95a6"] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderQualityRadar(state, dom) {
    destroy(state.charts.qualityRadar);
    const s = calcStats(state.groups);
    state.charts.qualityRadar = new Chart(dom.qualityRadarChart.getContext("2d"), {
        type: "radar",
        data: {
            labels: ["平均分平衡", "性别平衡", "多样性", "综合质量"],
            datasets: [{
                data: [10 - Math.min(10, s.scoreDiff * 4), 10 - Math.min(10, s.genderBalance * 10), Math.min(10, s.subjectDiversity * 10), s.overallQuality],
                borderColor: "#28d396",
                backgroundColor: "rgba(40,211,150,.16)"
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderGroupCompare(state, dom) {
    destroy(state.charts.groupComparison);
    const subjects = Object.keys(state.students[0]?.scores || {});
    const labels = state.groups.map((_, i) => `第${i + 1}组`);
    const datasets = subjects.map((sub, i) => ({
        label: sub,
        data: state.groups.map(group => group.reduce((sum, x) => sum + Number(x.scores[sub] || 0), 0) / (group.length || 1)),
        backgroundColor: `hsla(${(i * 70) % 360} 75% 58% / .70)`
    }));
    state.charts.groupComparison = new Chart(dom.groupComparisonChart.getContext("2d"), {
        type: "bar",
        data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderConvergence(state, dom) {
    destroy(state.charts.convergence);
    const labels = state.fitnessHistory.map((_, i) => i + 1);
    state.charts.convergence = new Chart(dom.convergenceChart.getContext("2d"), {
        type: "line",
        data: { labels, datasets: [{ label: "最佳拟合度", data: state.fitnessHistory, borderColor: "#57b6ff", backgroundColor: "rgba(87,182,255,.12)" }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderSubjectHeatmap(state, dom) {
    destroy(state.charts.subjectHeatmap);
    const subjects = Object.keys(state.students[0]?.scores || {});
    if (!subjects.length) return;
    const groupLabels = state.groups.map((_, i) => `第${i + 1}组`);
    const subjectMean = {};
    subjects.forEach(sub => {
        const arr = state.students.map(s => Number(s.scores[sub] || 0));
        subjectMean[sub] = arr.reduce((sum, x) => sum + x, 0) / (arr.length || 1);
    });
    const data = [];
    const colors = [];
    state.groups.forEach((group, gi) => {
        subjects.forEach(sub => {
            const gAvg = group.reduce((sum, s) => sum + Number(s.scores[sub] || 0), 0) / (group.length || 1);
            const rel = ((gAvg - subjectMean[sub]) / (subjectMean[sub] || 1)) * 100;
            data.push({ x: sub, y: groupLabels[gi], v: rel });
            const alpha = Math.min(1, Math.max(0.2, Math.abs(rel) / 20));
            colors.push(rel >= 0 ? `rgba(45, 205, 134, ${alpha})` : `rgba(230, 95, 117, ${alpha})`);
        });
    });
    state.charts.subjectHeatmap = new Chart(dom.subjectHeatmapChart.getContext("2d"), {
        type: "scatter",
        data: {
            datasets: [{
                label: "科目相对表现",
                data,
                backgroundColor: colors,
                pointRadius: 18,
                pointHoverRadius: 22
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => `相对表现 ${ctx.raw.v.toFixed(1)}%`
                    }
                }
            },
            scales: {
                x: { type: "category", labels: subjects, offset: true },
                y: { type: "category", labels: groupLabels, offset: true }
            }
        }
    });
}

function renderGroupTotalTrend(state, dom) {
    destroy(state.charts.groupTotalTrend);
    const labels = state.groups.map((_, i) => `第${i + 1}组`);
    const avgs = state.groups.map(group => group.reduce((sum, s) => sum + s.totalScore, 0) / (group.length || 1));
    const maxs = state.groups.map(group => Math.max(...group.map(s => s.totalScore)));
    const mins = state.groups.map(group => Math.min(...group.map(s => s.totalScore)));
    state.charts.groupTotalTrend = new Chart(dom.groupTotalTrendChart.getContext("2d"), {
        type: "line",
        data: {
            labels,
            datasets: [
                { label: "组均分", data: avgs, borderColor: "#4ea8ff", backgroundColor: "rgba(78,168,255,.12)", tension: 0.25 },
                { label: "组最高分", data: maxs, borderColor: "#2ed397", tension: 0.25 },
                { label: "组最低分", data: mins, borderColor: "#ff7d8a", tension: 0.25 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderInsightCards(state, dom) {
    if (!dom.classInsightCards) return;
    const totals = state.students.map(s => s.totalScore).sort((a, b) => a - b);
    const count = totals.length;
    const mean = totals.reduce((sum, x) => sum + x, 0) / (count || 1);
    const median = count % 2 ? totals[(count - 1) / 2] : (totals[count / 2 - 1] + totals[count / 2]) / 2;
    const top = totals[count - 1] || 0;
    const low = totals[0] || 0;
    const variance = totals.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (count || 1);
    const std = Math.sqrt(variance);
    const aboveMean = totals.filter(x => x >= mean).length;
    const spread = top - low;
    const cards = [
        ["班级人数", `${count}`],
        ["班均分", mean.toFixed(2)],
        ["中位数", median.toFixed(2)],
        ["标准差", std.toFixed(2)],
        ["最高-最低", spread.toFixed(2)],
        ["高于班均人数", `${aboveMean}`]
    ];
    dom.classInsightCards.innerHTML = cards.map(([label, value]) => `
        <article class="insight-card">
            <div class="insight-label">${label}</div>
            <div class="insight-value">${value}</div>
        </article>
    `).join("");
}

function renderGroupScoreTable(state, dom) {
    if (!dom.groupScoreTableWrap) return;
    const classAvg = state.students.reduce((sum, s) => sum + s.totalScore, 0) / (state.students.length || 1);
    const rows = state.groups.map((group, idx) => {
        const scores = group.map(s => s.totalScore);
        const avg = scores.reduce((sum, x) => sum + x, 0) / (scores.length || 1);
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const highCount = scores.filter(x => x >= classAvg).length;
        const male = group.filter(s => s.gender === "男").length;
        const female = group.filter(s => s.gender === "女").length;
        return { idx, avg, max, min, highCount, male, female };
    });
    dom.groupScoreTableWrap.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>小组</th>
                    <th>组均分</th>
                    <th>组最高分</th>
                    <th>组最低分</th>
                    <th>组内分差</th>
                    <th>高于班均人数</th>
                    <th>男/女</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => `
                    <tr>
                        <td>第${r.idx + 1}组</td>
                        <td>${r.avg.toFixed(2)}</td>
                        <td>${r.max.toFixed(2)}</td>
                        <td>${r.min.toFixed(2)}</td>
                        <td>${(r.max - r.min).toFixed(2)}</td>
                        <td>${r.highCount}</td>
                        <td>${r.male}/${r.female}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderStudentDetailTable(state, dom) {
    if (!dom.studentDetailTableWrap) return;
    const subjects = Object.keys(state.students[0]?.scores || {});
    const ranked = [...state.students].sort((a, b) => b.totalScore - a.totalScore);
    dom.studentDetailTableWrap.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>排名</th>
                    <th>姓名</th>
                    <th>性别</th>
                    <th>总分</th>
                    <th>优势科目</th>
                    <th>薄弱科目</th>
                    <th>与班均差</th>
                </tr>
            </thead>
            <tbody>
                ${ranked.map((s, idx) => {
                    const best = getBestSubject(s, subjects);
                    const weak = getWeakSubject(s, subjects);
                    const classAvg = state.students.reduce((sum, x) => sum + x.totalScore, 0) / (state.students.length || 1);
                    const diff = s.totalScore - classAvg;
                    return `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${s.name}</td>
                            <td>${s.gender}</td>
                            <td>${s.totalScore.toFixed(2)}</td>
                            <td>${best}</td>
                            <td>${weak}</td>
                            <td>${diff >= 0 ? "+" : ""}${diff.toFixed(2)}</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
}

function renderGroupDetailFold(state, dom) {
    if (!dom.groupDetailFoldWrap) return;
    dom.groupDetailFoldWrap.innerHTML = state.groups.map((group, idx) => {
        const avg = group.reduce((sum, s) => sum + s.totalScore, 0) / (group.length || 1);
        const max = Math.max(...group.map(s => s.totalScore));
        const min = Math.min(...group.map(s => s.totalScore));
        const male = group.filter(s => s.gender === "男").length;
        const female = group.filter(s => s.gender === "女").length;
        const sorted = [...group].sort((a, b) => b.totalScore - a.totalScore);
        return `
            <details class="mini-fold">
                <summary>第${idx + 1}组 ｜ 组均分 ${avg.toFixed(2)} ｜ 男/女 ${male}/${female}</summary>
                <div class="mini-stats">
                    <span>最高分 ${max.toFixed(2)}</span>
                    <span>最低分 ${min.toFixed(2)}</span>
                    <span>组内分差 ${(max - min).toFixed(2)}</span>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>姓名</th>
                                <th>性别</th>
                                <th>总分</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sorted.map(s => `
                                <tr>
                                    <td>${s.name}</td>
                                    <td>${s.gender}</td>
                                    <td>${s.totalScore.toFixed(2)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </details>
        `;
    }).join("");
}

function getBestSubject(student, subjects) {
    if (!subjects.length) return "-";
    let best = subjects[0];
    let bestScore = Number(student.scores[best] || 0);
    subjects.forEach(sub => {
        const score = Number(student.scores[sub] || 0);
        if (score > bestScore) {
            best = sub;
            bestScore = score;
        }
    });
    return `${best}(${bestScore.toFixed(1)})`;
}

function getWeakSubject(student, subjects) {
    if (!subjects.length) return "-";
    let weak = subjects[0];
    let weakScore = Number(student.scores[weak] || 0);
    subjects.forEach(sub => {
        const score = Number(student.scores[sub] || 0);
        if (score < weakScore) {
            weak = sub;
            weakScore = score;
        }
    });
    return `${weak}(${weakScore.toFixed(1)})`;
}
