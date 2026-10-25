/* Montagem de HTML e pequenos componentes visuais */
(function () {
    const f = SC.fmt;
    const t = SC.i18n.t;
    const i18n = SC.i18n;
    let toastTimer = null;
    let toastUndo = null;

    /**
     * Mostra um aviso no rodapé. Com onUndo, aparece o botão "Desfazer"
     * e o aviso fica mais tempo na tela.
     */
    function toast(msg, onUndo) {
        const el = document.getElementById("toast");
        const btn = document.getElementById("toastUndo");
        document.getElementById("toastText").textContent = msg;
        toastUndo = typeof onUndo === "function" ? onUndo : null;
        btn.hidden = !toastUndo;
        el.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(hideToast, toastUndo ? 6000 : 2600);
    }

    function hideToast() {
        clearTimeout(toastTimer);
        toastUndo = null;
        document.getElementById("toast").classList.remove("is-visible");
    }

    document.getElementById("toastUndo").addEventListener("click", () => {
        const fn = toastUndo;
        hideToast();
        if (fn) fn();
    });

    function slot(m) {
        return `<span class="sc-slot"><img class="sc-icon" src="${f.escape(f.iconUrl(m.id))}" alt="" loading="lazy" data-letter="${f.escape(i18n.itemName(m).charAt(0))}"></span>`;
    }

    // ícone que não carregou vira a inicial do item
    document.addEventListener("error", e => {
        const img = e.target;
        if (img instanceof HTMLImageElement && img.classList.contains("sc-icon")) {
            const span = document.createElement("span");
            span.textContent = img.dataset.letter || "?";
            img.replaceWith(span);
        }
    }, true);

    function projectTotals(p) {
        let total = 0, got = 0, done = 0;
        for (const m of p.materials) {
            total += m.total;
            got += Math.min(m.got, m.total);
            if (m.got >= m.total) done++;
        }
        return { total, got, done, types: p.materials.length, pct: total ? got / total * 100 : 0 };
    }

    function pctLabel(pct) {
        if (pct >= 100) return "100%";
        if (pct > 0 && pct < 1) return "<1%";
        return Math.floor(pct) + "%";
    }

    function renderProjectMenu(menu, state) {
        const ids = state.order;
        document.getElementById("projectCount").textContent = ids.length;
        if (!ids.length) {
            menu.innerHTML = `<span class="dropdown-item-text text-body-secondary">${f.escape(t("menu.empty"))}</span>`;
            return;
        }
        menu.innerHTML = ids.map(id => {
            const p = state.projects[id];
            const tot = projectTotals(p);
            return `<button type="button" class="dropdown-item${id === state.activeId ? " active" : ""}" data-project="${f.escape(id)}">
                <span class="sc-pm-name">${f.escape(p.name)}</span>
                <span class="sc-pm-meta"><span class="sc-pm-bar"><i style="width:${tot.pct.toFixed(1)}%"></i></span>${f.escape(t("menu.meta", { pct: pctLabel(tot.pct), n: f.number(tot.types) }))}</span>
            </button>`;
        }).join("");
    }

    function statsHtml(list) {
        return list.filter(([, v]) => v !== null && v !== undefined && v !== "")
            .map(([k, v]) => `<div><dt>${f.escape(k)}</dt><dd>${f.escape(v)}</dd></div>`).join("");
    }

    function sourceLine(p) {
        const s = p.source || {};
        const parts = [];
        const label = i18n.formatLabel(s);
        if (label) parts.push(label);
        if (s.fileName) parts.push(s.fileName);
        if (s.author) parts.push(t("source.by", { author: s.author }));
        return parts.join(", ") + (parts.length ? ". " : "") + t("source.imported", { date: f.date(p.createdAt) });
    }

    function renderSummary(p) {
        const tot = projectTotals(p);
        document.getElementById("projectTitle").textContent = p.name;
        document.getElementById("projectSource").textContent = sourceLine(p);

        const bar = document.getElementById("progressBar");
        bar.setAttribute("aria-valuenow", Math.floor(tot.pct));
        document.getElementById("progressFill").style.width = tot.pct.toFixed(2) + "%";
        // o texto do dicionário só tem <b> como marcação; os valores são números formatados
        document.getElementById("progressText").innerHTML = t("progress.text", {
            pct: pctLabel(tot.pct), got: f.number(tot.got), total: f.number(tot.total),
            done: f.number(tot.done), types: f.number(tot.types)
        });

        const size = f.size(p.source && p.source.size);
        document.getElementById("projectStats").innerHTML = statsHtml([
            [t("stats.types"), f.number(tot.types)],
            [t("stats.total"), f.number(tot.total)],
            [t("stats.missing"), f.number(tot.total - tot.got)],
            [t("stats.size"), size]
        ]);

        renderWarnings(document.getElementById("projectWarnings"), p.warnings);
    }

    function renderWarnings(el, warnings) {
        if (warnings && warnings.length) {
            el.innerHTML = warnings.map(w => `<p>${f.escape(i18n.warning(w))}</p>`).join("");
            el.classList.remove("d-none");
        } else {
            el.innerHTML = "";
            el.classList.add("d-none");
        }
    }

    function rowHtml(m, index) {
        const name = i18n.itemName(m);
        const done = m.got >= m.total;
        const missing = Math.max(0, m.total - m.got);
        const fill = done ? 0 : Math.min(100, m.got / m.total * 100);
        return `<li class="sc-row${done ? " is-done" : ""}" data-index="${index}" style="--fill:${fill.toFixed(1)}%">
            <input type="checkbox" class="sc-check" ${done ? "checked" : ""} aria-label="${f.escape(t("list.markAria", { name }))}">
            <div class="sc-item">
                ${slot(m)}
                <div class="sc-item-text">
                    <span class="sc-item-name" title="${f.escape(name)}">${f.escape(name)}</span>
                    <span class="sc-item-id">${f.escape(m.id)}</span>
                </div>
            </div>
            <div class="sc-got">
                <input type="number" class="sc-input sc-got-input" min="0" max="${m.total}" step="1" inputmode="numeric" value="${m.got}" aria-label="${f.escape(t("list.qtyAria", { name }))}">
                <span class="sc-got-total">/ ${f.number(m.total)}</span>
            </div>
            <div class="sc-missing">${missingHtml(m, missing, done)}</div>
        </li>`;
    }

    function missingHtml(m, missing, done) {
        if (done) return `<span class="sc-missing-n">${f.escape(t("list.complete"))}</span>`;
        return `<span class="sc-missing-n">${f.number(missing)}</span><span class="sc-missing-break">${f.escape(f.breakdown(missing, m.stack))}</span>`;
    }

    /** Atualiza só uma linha (sem redesenhar a lista, para não perder o foco do campo) */
    function updateRow(row, m) {
        const done = m.got >= m.total;
        const missing = Math.max(0, m.total - m.got);
        row.classList.toggle("is-done", done);
        row.style.setProperty("--fill", (done ? 0 : Math.min(100, m.got / m.total * 100)).toFixed(1) + "%");
        row.querySelector(".sc-check").checked = done;
        const input = row.querySelector(".sc-got-input");
        if (document.activeElement !== input) input.value = m.got;
        row.querySelector(".sc-missing").innerHTML = missingHtml(m, missing, done);
    }

    function renderPreview(el, project) {
        const top = project.materials.slice(0, 10);
        el.innerHTML = top.map(m => `<div class="sc-preview-row">${slot(m)}<span>${f.escape(i18n.itemName(m))}</span><b>${f.number(m.total)}</b></div>`).join("")
            + (project.materials.length > top.length
                ? `<div class="sc-preview-more">${f.escape(t("import.more", { n: f.number(project.materials.length - top.length) }))}</div>` : "");
    }

    SC.ui = { toast, renderProjectMenu, renderSummary, renderWarnings, rowHtml, updateRow, statsHtml, renderPreview, projectTotals };
})();
