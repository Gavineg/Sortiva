import { average, byId, shuffle, std } from "./utils.js";

export function buildConfig(dom) {
    return {
        groupSize: Number(dom.groupSize.value),
        mode: dom.groupMode.value,
        algorithm: dom.algorithmSelect ? dom.algorithmSelect.value : "genetic",
        maxScoreDiff: Number(dom.maxScoreDiff.value),
        minMales: Number(dom.minMales.value),
        minFemales: Number(dom.minFemales.value),
        genderRatio: Number(dom.genderRatio.value) / 100,
        scoreWeight: Number(dom.scoreWeight.value) / 100,
        diversityWeight: Number(dom.diversityWeight.value) / 100,
        populationSize: Number(dom.populationSize.value),
        maxGenerations: Number(dom.maxGenerations.value),
        mutationRate: Number(dom.mutationRate.value) / 100
    };
}

function modeWeights(config) {
    if (config.mode === "balanced") return { ...config, scoreWeight: 0.7, diversityWeight: 0.3 };
    if (config.mode === "diverse") return { ...config, scoreWeight: 0.35, diversityWeight: 0.65 };
    if (config.mode === "gender_balanced") return { ...config, scoreWeight: 0.45, diversityWeight: 0.35 };
    return config;
}

function createRandomGrouping(students, numGroups, groupSize) {
    const shuffled = shuffle(students);
    return Array.from({ length: numGroups }, (_, i) => shuffled.slice(i * groupSize, (i + 1) * groupSize));
}

function averageScore(group) {
    return average(group.map(x => x.totalScore));
}

function groupDiversity(group) {
    if (group.length < 2) return 0;
    const subjects = Object.keys(group[0].scores || {});
    if (!subjects.length) return 0;
    return average(
        subjects.map(sub => std(group.map(x => Number(x.scores[sub] || 0))))
    );
}

function findStudentGroup(grouping, sid) {
    return grouping.findIndex(g => g.some(s => s.id === sid));
}

function constraintPenalty(grouping, constraints) {
    let p = 0;
    for (const c of constraints) {
        const g1 = findStudentGroup(grouping, c.student1);
        const g2 = findStudentGroup(grouping, c.student2);
        if (g1 < 0 || g2 < 0) continue;
        if (c.type === "must_together" && g1 !== g2) p += 4.5;
        if (c.type === "must_separate" && g1 === g2) p += 4.5;
        if (c.type === "not_adjacent" && Math.abs(g1 - g2) <= 1) p += 3.2;
    }
    return p;
}

function evaluate(grouping, config, constraints) {
    const gAvgs = grouping.map(averageScore);
    const scoreDiff = Math.max(...gAvgs) - Math.min(...gAvgs);
    const scorePenalty = Math.max(0, scoreDiff - config.maxScoreDiff) * 9;
    const scoreFitness = 1 / (1 + std(gAvgs)) - scorePenalty;
    const genderFit = average(grouping.map(group => {
        const male = group.filter(s => s.gender === "男").length;
        const female = group.filter(s => s.gender === "女").length;
        const total = male + female || 1;
        const ratioFit = 1 - Math.abs(male / total - config.genderRatio);
        const reqPenalty = Math.max(0, config.minMales - male) + Math.max(0, config.minFemales - female);
        return ratioFit - reqPenalty * 1.8;
    }));
    const diversityFit = average(grouping.map(groupDiversity));
    const cPenalty = constraintPenalty(grouping, constraints);
    return config.scoreWeight * scoreFitness + (1 - config.scoreWeight - config.diversityWeight) * genderFit + config.diversityWeight * diversityFit - cPenalty;
}

function repair(grouping, students) {
    const seen = new Set();
    const misses = [];
    const dups = [];
    grouping.forEach(group => group.forEach(student => {
        if (seen.has(student.id)) dups.push(student.id);
        else seen.add(student.id);
    }));
    students.forEach(s => { if (!seen.has(s.id)) misses.push(s); });
    if (!dups.length || !misses.length) return;
    let idx = 0;
    for (let g = 0; g < grouping.length && idx < misses.length; g++) {
        for (let i = 0; i < grouping[g].length && idx < misses.length; i++) {
            if (dups.includes(grouping[g][i].id)) grouping[g][i] = misses[idx++];
        }
    }
}

function crossover(p1, p2, students) {
    const cut = Math.floor(Math.random() * p1.length);
    const c1 = p1.map((group, i) => i < cut ? [...group] : [...(p2[i] || [])]);
    const c2 = p2.map((group, i) => i < cut ? [...group] : [...(p1[i] || [])]);
    repair(c1, students);
    repair(c2, students);
    return [c1, c2];
}

function mutate(grouping) {
    const g1 = Math.floor(Math.random() * grouping.length);
    let g2 = Math.floor(Math.random() * grouping.length);
    if (g2 === g1) g2 = (g2 + 1) % grouping.length;
    if (!grouping[g1]?.length || !grouping[g2]?.length) return;
    const i1 = Math.floor(Math.random() * grouping[g1].length);
    const i2 = Math.floor(Math.random() * grouping[g2].length);
    [grouping[g1][i1], grouping[g2][i2]] = [grouping[g2][i2], grouping[g1][i1]];
}

function tournament(pop, size = 5) {
    let best = pop[Math.floor(Math.random() * pop.length)];
    for (let i = 1; i < size; i++) {
        const c = pop[Math.floor(Math.random() * pop.length)];
        if (c.fitness > best.fitness) best = c;
    }
    return best.grouping;
}

export function runGrouping(students, rawConfig, constraints, onTick, onFinish) {
    const config = modeWeights(rawConfig);
    const numGroups = Math.ceil(students.length / config.groupSize);

    // Algorithm selection based on config
    if (config.algorithm === "greedy") {
        return runGreedyGrouping(students, config, numGroups, constraints, onTick, onFinish);
    }
    if (config.algorithm === "simulated_annealing") {
        return runSAGrouping(students, config, numGroups, constraints, onTick, onFinish);
    }

    // Default: genetic algorithm
    let population = Array.from({ length: config.populationSize }, () => createRandomGrouping(students, numGroups, config.groupSize));
    let best = population[0];
    let bestFitness = -Infinity;
    const fitnessHistory = [];
    let gen = 0;
    let stagnantCount = 0;
    const earlyStopThreshold = 150; // Stop if no improvement for 150 generations

    const loop = () => {
        const evaluated = population.map(grouping => ({ grouping, fitness: evaluate(grouping, config, constraints) }))
            .sort((a, b) => b.fitness - a.fitness);
        const prevBest = bestFitness;
        if (evaluated[0].fitness > bestFitness) {
            bestFitness = evaluated[0].fitness;
            best = JSON.parse(JSON.stringify(evaluated[0].grouping));
            stagnantCount = 0;
        } else {
            stagnantCount++;
        }
        gen++;
        fitnessHistory.push(bestFitness);
        onTick({ gen, max: config.maxGenerations, bestFitness, fitnessHistory });
        if (gen >= config.maxGenerations || stagnantCount >= earlyStopThreshold) {
            onFinish({ groups: best, fitnessHistory, bestFitness });
            return;
        }
        const next = [];
        while (next.length < config.populationSize) {
            const p1 = tournament(evaluated);
            const p2 = tournament(evaluated);
            const [c1, c2] = crossover(p1, p2, students);
            if (Math.random() < config.mutationRate) mutate(c1);
            if (Math.random() < config.mutationRate) mutate(c2);
            next.push(c1, c2);
        }
        population = next.slice(0, config.populationSize);
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}

// Fast greedy algorithm - sorts by score and distributes evenly
function runGreedyGrouping(students, config, numGroups, constraints, onTick, onFinish) {
    const sorted = [...students].sort((a, b) => b.totalScore - a.totalScore);
    const groups = Array.from({ length: numGroups }, () => []);
    const fitnessHistory = [];

    // Snake draft distribution
    sorted.forEach((student, i) => {
        const round = Math.floor(i / numGroups);
        const idx = round % 2 === 0 ? i % numGroups : numGroups - 1 - (i % numGroups);
        groups[idx].push(student);
    });

    // Quick optimization: swap to satisfy constraints
    for (let iter = 0; iter < 50; iter++) {
        let improved = false;
        for (const c of constraints) {
            const g1 = groups.findIndex(g => g.some(s => s.id === c.student1));
            const g2 = groups.findIndex(g => g.some(s => s.id === c.student2));
            if (g1 < 0 || g2 < 0) continue;
            if (c.type === "must_together" && g1 !== g2) {
                const s2idx = groups[g2].findIndex(s => s.id === c.student2);
                const swapTarget = groups[g1].length > groups[g2].length ? groups[g1].length - 1 : 0;
                const temp = groups[g1][swapTarget];
                groups[g1][swapTarget] = groups[g2][s2idx];
                groups[g2][s2idx] = temp;
                improved = true;
            }
            if (c.type === "must_separate" && g1 === g2) {
                const otherGroup = (g1 + 1) % numGroups;
                const s2idx = groups[g1].findIndex(s => s.id === c.student2);
                const temp = groups[otherGroup][0];
                groups[otherGroup][0] = groups[g1][s2idx];
                groups[g1][s2idx] = temp;
                improved = true;
            }
        }
        const fitness = evaluate(groups, config, constraints);
        fitnessHistory.push(fitness);
        onTick({ gen: iter + 1, max: 50, bestFitness: fitness, fitnessHistory });
        if (!improved) break;
    }

    const finalFitness = evaluate(groups, config, constraints);
    fitnessHistory.push(finalFitness);
    setTimeout(() => onFinish({ groups, fitnessHistory, bestFitness: finalFitness }), 300);
}

// Simulated Annealing algorithm - batched for speed
function runSAGrouping(students, config, numGroups, constraints, onTick, onFinish) {
    let current = createRandomGrouping(students, numGroups, config.groupSize);
    let currentFitness = evaluate(current, config, constraints);
    let best = JSON.parse(JSON.stringify(current));
    let bestFitness = currentFitness;
    const fitnessHistory = [];
    const maxIter = Math.min(config.maxGenerations, 300); // SA converges faster
    let iter = 0;
    let temperature = 1.0;
    const coolingRate = 0.98;
    let stagnant = 0;

    const loop = () => {
        // Batch 20 iterations per frame for speed
        const batchSize = 20;
        for (let b = 0; b < batchSize && iter < maxIter; b++) {
            const neighbor = JSON.parse(JSON.stringify(current));
            mutate(neighbor);
            const neighborFitness = evaluate(neighbor, config, constraints);
            const delta = neighborFitness - currentFitness;
            if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
                current = neighbor;
                currentFitness = neighborFitness;
            }
            const prevBest = bestFitness;
            if (currentFitness > bestFitness) {
                bestFitness = currentFitness;
                best = JSON.parse(JSON.stringify(current));
                stagnant = 0;
            } else {
                stagnant++;
            }
            temperature *= coolingRate;
            iter++;
            fitnessHistory.push(bestFitness);
        }
        onTick({ gen: iter, max: maxIter, bestFitness, fitnessHistory });
        if (iter >= maxIter || stagnant >= 60) {
            onFinish({ groups: best, fitnessHistory, bestFitness });
            return;
        }
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}

export function calcStats(groups) {
    if (!groups.length) return { scoreDiff: 0, genderBalance: 0, subjectDiversity: 0, overallQuality: 0 };
    const avgs = groups.map(averageScore);
    const scoreDiff = Math.max(...avgs) - Math.min(...avgs);
    const genderRatios = groups.map(group => {
        const m = group.filter(s => s.gender === "男").length;
        const f = group.filter(s => s.gender === "女").length;
        return m / (m + f || 1);
    });
    const genderBalance = std(genderRatios);
    const subjectDiversity = average(groups.map(groupDiversity));
    const overallQuality = Math.max(0, Math.min(10, 10 - scoreDiff * 2 - genderBalance * 5 + subjectDiversity * 3));
    return { scoreDiff, genderBalance, subjectDiversity, overallQuality };
}

export function strongestSubject(group) {
    if (!group.length) return "无";
    const subs = Object.keys(group[0].scores || {});
    if (!subs.length) return "无";
    let best = subs[0];
    let bestAvg = -Infinity;
    subs.forEach(sub => {
        const avg = average(group.map(s => Number(s.scores[sub] || 0)));
        if (avg > bestAvg) {
            best = sub;
            bestAvg = avg;
        }
    });
    return best;
}

export function countGender(group, target) {
    return group.filter(s => s.gender === target).length;
}

export function getStudentName(students, id) {
    return byId(students, id)?.name || `ID:${id}`;
}
