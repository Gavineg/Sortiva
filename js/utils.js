export function normText(value) {
    return (value ?? "").toString().trim();
}

export function toGender(value) {
    const raw = normText(value);
    if (!raw) return "未知";
    const hit = raw[0];
    if (hit === "男" || hit === "女") return hit;
    if (/male/i.test(raw)) return "男";
    if (/female/i.test(raw)) return "女";
    return hit;
}

export function average(list) {
    if (!list.length) return 0;
    return list.reduce((s, x) => s + x, 0) / list.length;
}

export function std(list) {
    if (!list.length) return 0;
    const avg = average(list);
    return Math.sqrt(average(list.map(x => (x - avg) ** 2)));
}

export function shuffle(arr) {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export function byId(list, id) {
    return list.find(x => x.id === id);
}

export function tsFile(prefix) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    return `${prefix}_${stamp}.xlsx`;
}
