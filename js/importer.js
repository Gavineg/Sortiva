import { state } from "./state.js";
import { normText, toGender } from "./utils.js";

const NAME_KEYS = ["姓名", "name", "学生", "学生姓名"];
const GENDER_KEYS = ["性别", "gender", "男女"];
const SKIP_KEYS = ["总分", "班级", "学号", "序号", "排名"];

function keyHit(text, keys) {
    const lower = text.toLowerCase();
    return keys.some(k => lower.includes(k.toLowerCase()));
}

export async function readExcelRows(file) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellText: false });
    const first = workbook.SheetNames[0];
    const ws = workbook.Sheets[first];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

export function detectHeaderAndMapping(rows) {
    let headerIndex = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
        const joined = (rows[i] || []).map(normText).join("|");
        if (/姓名|name/i.test(joined)) {
            headerIndex = i;
            break;
        }
    }
    const headers = (rows[headerIndex] || []).map(normText);
    const nameCol = headers.findIndex(h => keyHit(h, NAME_KEYS));
    const genderCol = headers.findIndex(h => keyHit(h, GENDER_KEYS));
    const subjectCols = headers
        .map((h, i) => ({ h, i }))
        .filter(({ h, i }) => h && i !== nameCol && i !== genderCol && !keyHit(h, SKIP_KEYS))
        .map(({ i }) => i);
    const confidence = (nameCol >= 0 ? 1 : 0) + (subjectCols.length > 0 ? 1 : 0) + (genderCol >= 0 ? 1 : 0);
    return {
        headerIndex,
        headers,
        mapping: { nameCol, genderCol, subjectCols },
        needManual: nameCol < 0 || subjectCols.length === 0,
        confidence
    };
}

export function parseStudents(rows, headerIndex, mapping) {
    const headers = rows[headerIndex].map(normText);
    const students = [];
    for (let r = headerIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every(v => normText(v) === "")) continue;
        const name = normText(row[mapping.nameCol]) || `学生${students.length + 1}`;
        const scores = {};
        let total = 0;
        let valid = 0;
        mapping.subjectCols.forEach(col => {
            const subject = headers[col] || `科目${col + 1}`;
            const score = Number(row[col]);
            if (Number.isFinite(score)) {
                scores[subject] = score;
                total += score;
                valid++;
            }
        });
        students.push({
            id: students.length + 1,
            name,
            gender: mapping.genderCol >= 0 ? toGender(row[mapping.genderCol]) : "未知",
            scores,
            totalScore: Number((valid ? total : 0).toFixed(2))
        });
    }
    return students;
}

export function populateMappingSelectors(headers, mapping, dom) {
    dom.nameColumnSelect.innerHTML = "";
    dom.genderColumnSelect.innerHTML = "<option value='-1'>未提供</option>";
    dom.subjectsSelect.innerHTML = "";
    headers.forEach((h, i) => {
        const label = h || `列${i + 1}`;
        dom.nameColumnSelect.insertAdjacentHTML("beforeend", `<option value="${i}">${label}</option>`);
        dom.genderColumnSelect.insertAdjacentHTML("beforeend", `<option value="${i}">${label}</option>`);
        dom.subjectsSelect.insertAdjacentHTML("beforeend", `<option value="${i}">${label}</option>`);
    });
    if (mapping.nameCol >= 0) dom.nameColumnSelect.value = String(mapping.nameCol);
    if (mapping.genderCol >= 0) dom.genderColumnSelect.value = String(mapping.genderCol);
    [...dom.subjectsSelect.options].forEach(opt => {
        if (mapping.subjectCols.includes(Number(opt.value))) opt.selected = true;
    });
}

export function extractManualMapping(dom) {
    const nameCol = Number(dom.nameColumnSelect.value);
    const genderCol = Number(dom.genderColumnSelect.value);
    const subjectCols = [...dom.subjectsSelect.selectedOptions].map(o => Number(o.value));
    return { nameCol, genderCol, subjectCols };
}

export async function runImportAnimation(dom, task) {
    dom.importAnimation.classList.remove("hidden");
    const stages = ["读取文件中...", "识别表头中...", "切分数据中...", "整理学生数据中..."];
    for (let i = 0; i < stages.length; i++) {
        dom.importStageText.textContent = stages[i];
        dom.importProgressFill.style.width = `${((i + 1) / stages.length) * 100}%`;
        await new Promise(r => setTimeout(r, 230));
    }
    const result = await task();
    dom.importAnimation.classList.add("hidden");
    dom.importProgressFill.style.width = "0%";
    return result;
}

export async function mergeGenderFile(file) {
    const rows = await readExcelRows(file);
    if (rows.length < 2) return 0;
    const head = rows[0].map(normText);
    const nameCol = head.findIndex(h => keyHit(h, NAME_KEYS));
    const genderCol = head.findIndex(h => keyHit(h, GENDER_KEYS));
    if (nameCol < 0 || genderCol < 0) return 0;
    const m = new Map();
    rows.slice(1).forEach(row => {
        const name = normText(row[nameCol]);
        if (name) m.set(name, toGender(row[genderCol]));
    });
    let hit = 0;
    state.students = state.students.map(s => {
        if (m.has(s.name)) {
            hit++;
            return { ...s, gender: m.get(s.name) };
        }
        return s;
    });
    return hit;
}
