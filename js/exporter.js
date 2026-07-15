import { tsFile } from "./utils.js";

export function exportResults(groups, mode = "full") {
    if (!groups.length) return;
    const wb = XLSX.utils.book_new();
    if (mode === "simple") {
        const rows = [["组序号", "成员"]];
        groups.forEach((group, idx) => {
            const members = [...group]
                .sort((a, b) => b.totalScore - a.totalScore)
                .map(s => `${s.name}(${s.gender})`)
                .join("、");
            rows.push([`第${idx + 1}组`, members]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "全班分组");
        XLSX.writeFile(wb, tsFile("分组结果_简约"));
        return;
    }
    groups.forEach((group, idx) => {
        const heads = ["姓名", "性别", ...Object.keys(group[0]?.scores || {}), "总分"];
        const rows = [heads];
        [...group].sort((a, b) => b.totalScore - a.totalScore).forEach(s => {
            rows.push([s.name, s.gender, ...heads.slice(2, -1).map(h => s.scores[h] || 0), s.totalScore]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `第${idx + 1}组`);
    });
    XLSX.writeFile(wb, tsFile("分组结果"));
}

export function exportAnalysis(groups, students) {
    if (!groups.length || !students?.length) return;
    const wb = XLSX.utils.book_new();
    const subjects = Object.keys(students[0]?.scores || {});
    const classAvg = students.reduce((sum, s) => sum + s.totalScore, 0) / students.length;
    const rows = [["组别", "人数", "男生", "女生", ...subjects.map(s => `${s}均分`), "总分均分", "组最高分", "组最低分", "组内分差", "高于班均人数"]];
    groups.forEach((group, i) => {
        const male = group.filter(s => s.gender === "男").length;
        const female = group.filter(s => s.gender === "女").length;
        const subAvg = subjects.map(sub => group.reduce((sum, s) => sum + Number(s.scores[sub] || 0), 0) / group.length);
        const totalAvg = group.reduce((sum, s) => sum + s.totalScore, 0) / group.length;
        const max = Math.max(...group.map(s => s.totalScore));
        const min = Math.min(...group.map(s => s.totalScore));
        const highCount = group.filter(s => s.totalScore >= classAvg).length;
        rows.push([`第${i + 1}组`, group.length, male, female, ...subAvg.map(x => x.toFixed(2)), totalAvg.toFixed(2), max.toFixed(2), min.toFixed(2), (max - min).toFixed(2), highCount]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "小组汇总");

    const totals = students.map(s => s.totalScore).sort((a, b) => a - b);
    const count = totals.length;
    const mean = totals.reduce((sum, x) => sum + x, 0) / count;
    const median = count % 2 ? totals[(count - 1) / 2] : (totals[count / 2 - 1] + totals[count / 2]) / 2;
    const variance = totals.reduce((sum, x) => sum + (x - mean) ** 2, 0) / count;
    const std = Math.sqrt(variance);
    const insightRows = [
        ["指标", "值"],
        ["班级人数", count],
        ["班均分", mean.toFixed(2)],
        ["中位数", median.toFixed(2)],
        ["标准差", std.toFixed(2)],
        ["最高-最低", (totals[count - 1] - totals[0]).toFixed(2)],
        ["高于班均人数", students.filter(s => s.totalScore >= mean).length]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(insightRows), "班级洞察");

    const detailRows = [["排名", "姓名", "性别", "总分", "优势科目", "薄弱科目", "与班均差"]];
    [...students].sort((a, b) => b.totalScore - a.totalScore).forEach((s, i) => {
        const best = subjectExtreme(s, subjects, "max");
        const weak = subjectExtreme(s, subjects, "min");
        detailRows.push([i + 1, s.name, s.gender, s.totalScore.toFixed(2), best, weak, signed(s.totalScore - mean)]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailRows), "个人明细");

    const scoreDist = buildScoreDistribution(students);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["分数区间", "人数"], ...scoreDist]), "成绩分布");

    const male = students.filter(s => s.gender === "男").length;
    const female = students.filter(s => s.gender === "女").length;
    const unknown = students.length - male - female;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["类别", "人数"], ["男", male], ["女", female], ["未知", unknown]]), "性别比例");

    const qualityRows = [["指标", "值"]];
    const groupAvgs = groups.map(group => group.reduce((sum, s) => sum + s.totalScore, 0) / group.length);
    const scoreDiff = Math.max(...groupAvgs) - Math.min(...groupAvgs);
    const genderRatios = groups.map(group => {
        const m = group.filter(s => s.gender === "男").length;
        const f = group.filter(s => s.gender === "女").length;
        return m / (m + f || 1);
    });
    const genderVar = Math.sqrt(genderRatios.reduce((sum, x) => sum + (x - avg(genderRatios)) ** 2, 0) / genderRatios.length);
    const diversity = avg(groups.map(group => groupSubjectStd(group, subjects)));
    const overall = Math.max(0, Math.min(10, 10 - scoreDiff * 2 - genderVar * 5 + diversity * 3));
    qualityRows.push(["组间平均分差", scoreDiff.toFixed(2)], ["性别平衡波动", genderVar.toFixed(2)], ["科目多样性", diversity.toFixed(2)], ["综合评分", overall.toFixed(2)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(qualityRows), "质量指标");

    const compareRows = [["组别", ...subjects]];
    groups.forEach((group, i) => {
        compareRows.push([`第${i + 1}组`, ...subjects.map(sub => (group.reduce((sum, s) => sum + Number(s.scores[sub] || 0), 0) / group.length).toFixed(2))]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(compareRows), "组间科目对比");

    const heatRows = [["小组", "科目", "相对表现%"]];
    const subMean = {};
    subjects.forEach(sub => {
        subMean[sub] = students.reduce((sum, s) => sum + Number(s.scores[sub] || 0), 0) / students.length;
    });
    groups.forEach((group, i) => {
        subjects.forEach(sub => {
            const gAvg = group.reduce((sum, s) => sum + Number(s.scores[sub] || 0), 0) / group.length;
            heatRows.push([`第${i + 1}组`, sub, (((gAvg - subMean[sub]) / (subMean[sub] || 1)) * 100).toFixed(2)]);
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(heatRows), "科目热力数据");

    const trendRows = [["小组", "组均分", "组最高分", "组最低分"]];
    groups.forEach((group, i) => {
        const scores = group.map(s => s.totalScore);
        trendRows.push([`第${i + 1}组`, avg(scores).toFixed(2), Math.max(...scores).toFixed(2), Math.min(...scores).toFixed(2)]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendRows), "小组趋势");

    XLSX.writeFile(wb, tsFile("分组分析"));
}

export function exportComparison(groups) {
    if (!groups.length) return;
    const wb = XLSX.utils.book_new();
    groups.forEach((group, i) => {
        const subjects = Object.keys(group[0]?.scores || {});
        const subAvg = subjects.map(sub => group.reduce((sum, s) => sum + Number(s.scores[sub] || 0), 0) / group.length);
        const totalAvg = group.reduce((sum, s) => sum + s.totalScore, 0) / group.length;
        const rows = [["姓名", "性别", ...subjects, "总分"]];
        group.forEach(s => {
            const arr = [s.name, s.gender];
            subjects.forEach((sub, idx) => {
                const d = Number(s.scores[sub] || 0) - subAvg[idx];
                arr.push(`${d >= 0 ? "+" : ""}${d.toFixed(1)}`);
            });
            const td = s.totalScore - totalAvg;
            arr.push(`${td >= 0 ? "+" : ""}${td.toFixed(1)}`);
            rows.push(arr);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `第${i + 1}组`);
    });
    XLSX.writeFile(wb, tsFile("组内对比"));
}

function signed(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function avg(list) {
    return list.reduce((sum, x) => sum + x, 0) / (list.length || 1);
}

function subjectExtreme(student, subjects, mode) {
    if (!subjects.length) return "-";
    let hit = subjects[0];
    let val = Number(student.scores[hit] || 0);
    subjects.forEach(sub => {
        const score = Number(student.scores[sub] || 0);
        if ((mode === "max" && score > val) || (mode === "min" && score < val)) {
            hit = sub;
            val = score;
        }
    });
    return `${hit}(${val.toFixed(1)})`;
}

function groupSubjectStd(group, subjects) {
    if (!group.length || !subjects.length) return 0;
    return avg(subjects.map(sub => {
        const values = group.map(s => Number(s.scores[sub] || 0));
        const m = avg(values);
        return Math.sqrt(avg(values.map(v => (v - m) ** 2)));
    }));
}

function buildScoreDistribution(students) {
    const scores = students.map(s => s.totalScore);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const bins = Math.max(5, Math.min(10, Math.ceil(scores.length / 4)));
    const step = (max - min || 1) / bins;
    const ys = Array.from({ length: bins }, () => 0);
    scores.forEach(s => {
        const idx = Math.min(bins - 1, Math.floor((s - min) / step));
        ys[idx]++;
    });
    return ys.map((count, i) => [`${(min + i * step).toFixed(0)}-${(min + (i + 1) * step).toFixed(0)}`, count]);
}
