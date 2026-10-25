/* Controlador da página */
(function () {
    const f = SC.fmt;
    const t = SC.i18n.t;
    const i18n = SC.i18n;
    const ui = SC.ui;
    const store = SC.storage;
    const state = SC.state = store.load();

    const $ = id => document.getElementById(id);
    const el = {
        empty: $("emptyState"),
        view: $("projectView"),
        menu: $("projectMenu"),
        list: $("materialsList"),
        listEmpty: $("listEmpty"),
        search: $("searchInput"),
        status: $("statusFilter"),
        sort: $("sortOrder"),
        // importação
        fileInput: $("fileInput"),
        fileInputEmpty: $("fileInputEmpty"),
        stepPick: $("importStepPick"),
        stepBusy: $("importStepBusy"),
        busyText: $("importBusyText"),
        stepReview: $("importStepReview"),
        importName: $("importName"),
        importStats: $("importStats"),
        importWarnings: $("importWarnings"),
        importPreview: $("importPreview"),
        importReplace: $("importReplace"),
        importError: $("importError"),
        btnBack: $("btnImportBack"),
        btnSave: $("btnImportSave"),
        // confirmação
        confirmTitle: $("confirmTitle"),
        confirmText: $("confirmText"),
        confirmInput: $("confirmInput"),
        confirmOk: $("confirmOk"),
    };

    const importModal = new bootstrap.Modal($("importModal"));
    const confirmModal = new bootstrap.Modal($("confirmModal"));

    let lastImportError = null; // para traduzir de novo se o idioma mudar
    let pendingImport = null;   // projeto vindo do servidor, aguardando "Salvar"
    let importToken = 0;        // ignora respostas de importações canceladas

    const active = () => state.projects[state.activeId] || null;

    // ==============================================================
    // Renderização
    // ==============================================================
    function render() {
        ui.renderProjectMenu(el.menu, state);
        const p = active();
        el.empty.classList.toggle("d-none", !!p);
        el.view.classList.toggle("d-none", !p);
        if (!p) return;
        ui.renderSummary(p);
        renderList();
    }

    function visibleMaterials(p) {
        const q = el.search.value.trim().toLowerCase();
        const status = state.prefs.status;
        let rows = p.materials.map((m, index) => ({ m, index }));

        // busca no nome do idioma atual, no nome em inglês e no id
        if (q) rows = rows.filter(({ m }) =>
            i18n.itemName(m).toLowerCase().includes(q) || (m.name || "").toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
        if (status === "pending") rows = rows.filter(({ m }) => m.got < m.total);
        else if (status === "done") rows = rows.filter(({ m }) => m.got >= m.total);

        const missing = m => m.total - Math.min(m.got, m.total);
        const loc = i18n.locale();
        const byName = (a, b) => i18n.itemName(a.m).localeCompare(i18n.itemName(b.m), loc);
        const sorters = {
            "total-desc":   (a, b) => b.m.total - a.m.total,
            "total-asc":    (a, b) => a.m.total - b.m.total,
            "missing-desc": (a, b) => missing(b.m) - missing(a.m),
            "name-asc":     byName,
        };
        rows.sort((a, b) => ((a.m.got >= a.m.total) - (b.m.got >= b.m.total)) || (sorters[state.prefs.sort] || sorters["total-desc"])(a, b) || byName(a, b));
        return rows;
    }

    function renderList() {
        const p = active();
        const rows = visibleMaterials(p);
        el.list.innerHTML = rows.map(({ m, index }) => ui.rowHtml(m, index)).join("");

        if (!rows.length) {
            const q = el.search.value.trim();
            el.listEmpty.textContent = q
                ? t("list.emptySearch", { q })
                : state.prefs.status === "pending" ? t("list.emptyPending")
                : state.prefs.status === "done" ? t("list.emptyDone")
                : t("list.emptyAll");
            el.listEmpty.classList.remove("d-none");
        } else {
            el.listEmpty.classList.add("d-none");
        }
    }

    function applyPrefsToControls() {
        el.sort.value = state.prefs.sort;
        for (const b of el.status.querySelectorAll("button")) {
            b.classList.toggle("is-active", b.dataset.status === state.prefs.status);
            b.setAttribute("aria-pressed", b.dataset.status === state.prefs.status);
        }
    }

    function selectProject(id) {
        if (!state.projects[id]) return;
        state.activeId = id;
        el.search.value = "";
        store.save(state);
        render();
    }

    // ==============================================================
    // Edição de quantidades
    // ==============================================================
    function setGot(index, value, rerender) {
        const p = active();
        const m = p && p.materials[index];
        if (!m) return;
        const v = Math.max(0, Math.min(m.total, Math.floor(Number(value) || 0)));
        if (v === m.got) return;
        m.got = v;
        p.updatedAt = Date.now();
        store.saveSoon(state);

        ui.renderSummary(p);
        ui.renderProjectMenu(el.menu, state);
        if (rerender) {
            renderList();
        } else {
            const row = el.list.querySelector(`.sc-row[data-index="${index}"]`);
            if (row) ui.updateRow(row, m);
        }
    }

    /**
     * Marca/desmarca um item inteiro e oferece "Desfazer" para o caso de clique errado.
     * O desfazer devolve a quantidade exata que estava antes (inclusive coleta parcial).
     */
    function toggleItem(index, markDone) {
        const p = active();
        const m = p && p.materials[index];
        if (!m) return;
        const before = m.got;
        const projectId = p.id;
        setGot(index, markDone ? m.total : 0, true);

        ui.toast(t(markDone ? "toast.marked" : "toast.unmarked", { name: i18n.itemName(m) }), () => {
            const proj = state.projects[projectId];
            if (!proj || !proj.materials[index]) return;
            if (state.activeId !== projectId) selectProject(projectId);
            setGot(index, before, true);
            store.save(state);
        });
    }

    el.list.addEventListener("change", e => {
        const row = e.target.closest(".sc-row");
        if (!row) return;
        const index = Number(row.dataset.index);
        if (e.target.classList.contains("sc-check")) {
            toggleItem(index, e.target.checked);
        } else if (e.target.classList.contains("sc-got-input")) {
            setGot(index, e.target.value, true);
        }
    });

    el.list.addEventListener("input", e => {
        if (!e.target.classList.contains("sc-got-input")) return;
        const row = e.target.closest(".sc-row");
        setGot(Number(row.dataset.index), e.target.value, false);
    });

    el.list.addEventListener("keydown", e => {
        if (e.key === "Enter" && e.target.classList.contains("sc-got-input")) e.target.blur();
    });

    // clicar no nome/ícone também marca
    el.list.addEventListener("click", e => {
        if (!e.target.closest(".sc-item")) return;
        const row = e.target.closest(".sc-row");
        const index = Number(row.dataset.index);
        const m = active().materials[index];
        toggleItem(index, m.got < m.total);
    });

    // ==============================================================
    // Filtros
    // ==============================================================
    el.search.addEventListener("input", renderList);
    el.sort.addEventListener("change", () => {
        state.prefs.sort = el.sort.value;
        store.save(state);
        renderList();
    });
    el.status.addEventListener("click", e => {
        const b = e.target.closest("button[data-status]");
        if (!b) return;
        state.prefs.status = b.dataset.status;
        store.save(state);
        applyPrefsToControls();
        renderList();
    });

    el.menu.addEventListener("click", e => {
        const b = e.target.closest("[data-project]");
        if (b) selectProject(b.dataset.project);
    });

    // ==============================================================
    // Ações do projeto
    // ==============================================================
    function confirmDialog({ title, text, ok, danger = false, input = null }) {
        return new Promise(resolve => {
            el.confirmTitle.textContent = title;
            el.confirmText.textContent = text || "";
            el.confirmText.classList.toggle("d-none", !text);
            el.confirmOk.textContent = ok;
            el.confirmOk.className = "sc-btn " + (danger ? "sc-btn-danger" : "sc-btn-primary");
            el.confirmInput.classList.toggle("d-none", input === null);
            el.confirmInput.value = input ?? "";

            let result = null;
            const finish = () => {
                $("confirmModal").removeEventListener("hidden.bs.modal", finish);
                el.confirmOk.onclick = null;
                el.confirmInput.onkeydown = null;
                resolve(result);
            };
            const accept = () => {
                result = input === null ? true : el.confirmInput.value.trim();
                if (input !== null && !result) return el.confirmInput.focus();
                confirmModal.hide();
            };
            el.confirmOk.onclick = accept;
            el.confirmInput.onkeydown = ev => { if (ev.key === "Enter") accept(); };
            $("confirmModal").addEventListener("hidden.bs.modal", finish);
            $("confirmModal").addEventListener("shown.bs.modal", () => {
                (input !== null ? el.confirmInput : el.confirmOk).focus();
            }, { once: true });
            confirmModal.show();
        });
    }

    function exportProject(p) {
        // Mesmo formato do "Export JSON" do Litematica, então dá para reimportar aqui
        const data = {
            Name: p.name,
            Title: p.name,
            Multiplier: 1,
            Date: new Date().toUTCString(),
            Materials: p.materials.map(m => ({
                Item: m.id,
                Total: m.total,
                Missing: Math.max(0, m.total - m.got),
                Mismatched: 0,
                Available: m.got
            })),
            SchematicCount: { version: 2, collected: Object.fromEntries(p.materials.map(m => [m.id, m.got])) }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = p.name.replace(/[\\/:*?"<>|]+/g, "_") + ".json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    async function copyMissing(p) {
        const lines = p.materials
            .filter(m => m.got < m.total)
            .sort((a, b) => (b.total - b.got) - (a.total - a.got))
            .map(m => {
                const miss = m.total - m.got;
                return `${i18n.itemName(m)}: ${f.number(miss)} (${f.breakdown(miss, m.stack)})`;
            });
        if (!lines.length) return ui.toast(t("toast.nothingMissing"));
        const text = t("copy.header", { name: p.name }) + "\n" + lines.join("\n");
        try {
            await navigator.clipboard.writeText(text);
            ui.toast(t("toast.copied", { n: f.number(lines.length) }));
        } catch {
            ui.toast(t("toast.copyBlocked"));
        }
    }

    $("projectView").addEventListener("click", async e => {
        const b = e.target.closest("[data-action]");
        if (!b) return;
        const p = active();
        if (!p) return;

        switch (b.dataset.action) {
            case "rename": {
                const name = await confirmDialog({ title: t("dialog.renameTitle"), ok: t("dialog.renameOk"), input: p.name });
                if (name) {
                    p.name = name.slice(0, 80);
                    p.updatedAt = Date.now();
                    store.save(state);
                    render();
                }
                break;
            }
            case "copy-missing":
                copyMissing(p);
                break;
            case "export":
                exportProject(p);
                break;
            case "reset": {
                const ok = await confirmDialog({ title: t("dialog.resetTitle"), text: t("dialog.resetText", { name: p.name }), ok: t("dialog.resetOk") });
                if (ok) {
                    const before = p.materials.map(m => m.got);
                    p.materials.forEach(m => { m.got = 0; });
                    store.save(state);
                    render();
                    ui.toast(t("toast.reset"), () => {
                        p.materials.forEach((m, i) => { m.got = before[i] ?? 0; });
                        store.save(state);
                        render();
                    });
                }
                break;
            }
            case "delete": {
                const ok = await confirmDialog({ title: t("dialog.deleteTitle"), text: t("dialog.deleteText", { name: p.name }), ok: t("dialog.deleteOk"), danger: true });
                if (ok) {
                    delete state.projects[p.id];
                    state.order = state.order.filter(id => id !== p.id);
                    state.activeId = state.order[0] || null;
                    store.save(state);
                    render();
                    ui.toast(t("toast.deleted"));
                }
                break;
            }
        }
    });

    // ==============================================================
    // Importação
    // ==============================================================
    function showStep(step) {
        el.stepPick.classList.toggle("d-none", step !== "pick");
        el.stepBusy.classList.toggle("d-none", step !== "busy");
        el.stepReview.classList.toggle("d-none", step !== "review");
        el.btnBack.hidden = step !== "review" && step !== "error";
        el.btnSave.hidden = step !== "review";
        if (step !== "error") el.importError.classList.add("d-none");
    }

    function openImport(file) {
        pendingImport = null;
        showStep("pick");
        importModal.show();
        if (file) handleFile(file);
    }

    async function handleFile(file) {
        const token = ++importToken;
        showStep("busy");
        el.busyText.textContent = t("import.uploading", { file: file.name });

        try {
            const project = await SC.api.importFile(file, (phase, pct) => {
                if (token !== importToken) return;
                el.busyText.textContent = phase === "upload"
                    ? t("import.uploadingPct", { file: file.name, pct })
                    : t("import.processing");
            });
            if (token !== importToken) return;
            pendingImport = project;
            showReview(project);
        } catch (err) {
            if (token !== importToken) return;
            showStep("error");
            el.stepPick.classList.remove("d-none");
            lastImportError = err;
            el.importError.textContent = err.message;
            el.importError.classList.remove("d-none");
        }
    }

    function showReview(project, keepName) {
        showStep("review");
        if (!keepName) el.importName.value = project.name;
        const s = project.source || {};
        el.importStats.innerHTML = ui.statsHtml([
            [t("stats.format"), i18n.formatShort(s)],
            [t("stats.types"), f.number(project.stats.types)],
            [t("stats.items"), f.number(project.stats.items)],
            [f.size(s.size) ? t("stats.size") : t("stats.file"), f.size(s.size) || s.fileName],
        ]);
        ui.renderWarnings(el.importWarnings, project.warnings);
        ui.renderPreview(el.importPreview, project);
        checkDuplicateName();
        if (!keepName) setTimeout(() => el.importName.select(), 50);
    }

    function checkDuplicateName() {
        const name = el.importName.value.trim().toLowerCase();
        const dup = name && state.order.some(id => state.projects[id].name.toLowerCase() === name);
        el.importReplace.textContent = dup ? t("import.duplicate") : "";
        el.importReplace.classList.toggle("d-none", !dup);
    }
    el.importName.addEventListener("input", checkDuplicateName);

    el.stepReview.addEventListener("submit", e => {
        e.preventDefault();
        if (!pendingImport) return;
        const name = el.importName.value.trim();
        if (!name) return el.importName.focus();

        const src = pendingImport;
        const id = store.newId();
        state.projects[id] = {
            id,
            name: name.slice(0, 80),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            source: src.source,
            stats: src.stats,
            warnings: src.warnings || [],
            materials: src.materials.map(m => ({
                id: m.id,
                name: m.name,
                names: m.names || null,
                total: m.total,
                stack: m.stack || 64,
                got: Math.max(0, Math.min(m.total, m.got || 0))
            }))
        };
        state.order.unshift(id);
        state.activeId = id;
        state.prefs.status = "pending";
        if (!store.save(state)) {
            delete state.projects[id];
            state.order.shift();
            return;
        }
        pendingImport = null;
        importModal.hide();
        applyPrefsToControls();
        el.search.value = "";
        render();
        ui.toast(t("toast.saved"));
    });

    el.btnBack.addEventListener("click", () => {
        importToken++;
        pendingImport = null;
        el.fileInput.value = "";
        showStep("pick");
    });

    $("importModal").addEventListener("hidden.bs.modal", () => {
        importToken++;
        pendingImport = null;
        el.fileInput.value = "";
        el.fileInputEmpty.value = "";
    });

    $("btnOpenImport").addEventListener("click", () => openImport());
    el.fileInput.addEventListener("change", () => el.fileInput.files[0] && handleFile(el.fileInput.files[0]));
    el.fileInputEmpty.addEventListener("change", () => el.fileInputEmpty.files[0] && openImport(el.fileInputEmpty.files[0]));

    // Arrastar e soltar em qualquer lugar da página
    const cover = $("dragCover");
    let dragDepth = 0;
    const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");

    window.addEventListener("dragenter", e => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        if (++dragDepth === 1) cover.classList.add("is-visible");
    });
    window.addEventListener("dragover", e => { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener("dragleave", e => {
        if (!hasFiles(e)) return;
        if (--dragDepth <= 0) { dragDepth = 0; cover.classList.remove("is-visible"); }
    });
    window.addEventListener("drop", e => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth = 0;
        cover.classList.remove("is-visible");
        const file = e.dataTransfer.files[0];
        if (!file) return;
        if ($("importModal").classList.contains("show")) handleFile(file);
        else openImport(file);
    });

    // ==============================================================
    // Troca de idioma: redesenha tudo que é montado pelo JS
    // ==============================================================
    i18n.onChange(() => {
        render();
        if (pendingImport && !el.stepReview.classList.contains("d-none")) showReview(pendingImport, true);
        if (!el.stepBusy.classList.contains("d-none")) el.busyText.textContent = t("import.processing");
        if (lastImportError && lastImportError.code && !el.importError.classList.contains("d-none")) {
            el.importError.textContent = i18n.error(lastImportError.code, lastImportError.params);
        }
    });

    // ==============================================================
    applyPrefsToControls();
    render();
})();
