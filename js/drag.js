// Three drag behaviors:
// 1. Drag student to another group (move)
// 2. Drag student within same group (reorder)
// 3. Drag group header to reorder groups

let bound = false;

export function wireMemberDrag(state, dom, onChanged) {
    if (bound) return;
    bound = true;
    const container = dom.resultsContainer;
    let dragId = null;
    let dragType = null; // "student" or "group"
    let dragGroupIdx = null;

    // === STUDENT DRAG ===
    container.addEventListener("dragstart", function(e) {
        var item = e.target.closest(".student-item");
        if (item) {
            dragId = Number(item.dataset.studentId);
            dragType = "student";
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "student:" + dragId);
            setTimeout(function() { item.classList.add("dragging"); }, 0);
            return;
        }
        // === GROUP DRAG (from header) ===
        var header = e.target.closest(".group-header");
        if (header) {
            var card = header.closest(".group-card");
            dragGroupIdx = Number(card.dataset.groupIndex);
            dragType = "group";
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "group:" + dragGroupIdx);
            setTimeout(function() { card.classList.add("dragging"); }, 0);
        }
    });

    container.addEventListener("dragover", function(e) {
        if (dragType === "student") {
            // Highlight target group OR target position within same group
            var targetItem = e.target.closest(".student-item");
            var card = e.target.closest(".group-card");
            if (!card) return;
            e.preventDefault();
            container.querySelectorAll(".drop-target, .insert-above").forEach(function(el) { el.classList.remove("drop-target", "insert-above"); });
            // Check if same group - show insert position
            var targetGroupIdx = Number(card.dataset.groupIndex);
            var sourceGroupIdx = -1;
            for (var g = 0; g < state.groups.length; g++) {
                if (state.groups[g].some(function(s) { return s.id === dragId; })) { sourceGroupIdx = g; break; }
            }
            if (sourceGroupIdx === targetGroupIdx && targetItem) {
                targetItem.classList.add("insert-above");
            } else {
                card.classList.add("drop-target");
            }
        } else if (dragType === "group") {
            var card = e.target.closest(".group-card");
            if (!card) return;
            e.preventDefault();
            container.querySelectorAll(".drop-target").forEach(function(el) { el.classList.remove("drop-target"); });
            card.classList.add("drop-target");
        }
    });

    container.addEventListener("dragleave", function(e) {
        var card = e.target.closest(".group-card");
        if (card && !card.contains(e.relatedTarget)) {
            card.classList.remove("drop-target");
        }
        var item = e.target.closest(".student-item");
        if (item) item.classList.remove("insert-above");
    });

    container.addEventListener("drop", function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (dragType === "student" && dragId) {
            var card = e.target.closest(".group-card");
            if (!card) { reset(); return; }
            var targetGroupIdx = Number(card.dataset.groupIndex);
            var sourceGroupIdx = -1;
            var sourceIdx = -1;
            var student = null;
            for (var g = 0; g < state.groups.length; g++) {
                for (var s = 0; s < state.groups[g].length; s++) {
                    if (state.groups[g][s].id === dragId) {
                        sourceGroupIdx = g;
                        sourceIdx = s;
                        student = state.groups[g][s];
                        break;
                    }
                }
                if (student) break;
            }
            if (!student) { reset(); return; }

            if (sourceGroupIdx === targetGroupIdx) {
                // Same group: reorder
                var targetItem = e.target.closest(".student-item");
                if (targetItem) {
                    var targetId = Number(targetItem.dataset.studentId);
                    var targetIdx = state.groups[targetGroupIdx].findIndex(function(s) { return s.id === targetId; });
                    if (targetIdx >= 0 && targetIdx !== sourceIdx) {
                        // Remove first, then calculate insert position
                        state.groups[sourceGroupIdx].splice(sourceIdx, 1);
                        // After removal, if source was before target, target shifts down by 1
                        var insertIdx = sourceIdx < targetIdx ? targetIdx - 1 : targetIdx;
                        state.groups[targetGroupIdx].splice(insertIdx, 0, student);
                        reset();
                        onChanged();
                        return;
                    }
                }
            } else {
                // Different group: move
                state.groups[sourceGroupIdx].splice(sourceIdx, 1);
                state.groups[targetGroupIdx].push(student);
                reset();
                onChanged();
                return;
            }
        } else if (dragType === "group" && dragGroupIdx !== null) {
            var card = e.target.closest(".group-card");
            if (!card) { reset(); return; }
            var targetIdx = Number(card.dataset.groupIndex);
            if (targetIdx !== dragGroupIdx) {
                var moved = state.groups.splice(dragGroupIdx, 1)[0];
                state.groups.splice(targetIdx, 0, moved);
                reset();
                onChanged();
                return;
            }
        }
        reset();
    });

    container.addEventListener("dragend", function() {
        reset();
    });

    function reset() {
        dragId = null;
        dragType = null;
        dragGroupIdx = null;
        container.querySelectorAll(".dragging, .drop-target, .insert-above").forEach(function(el) {
            el.classList.remove("dragging", "drop-target", "insert-above");
        });
    }
}

export function wireGroupOrderDrag(state, dom, onChanged) {}
