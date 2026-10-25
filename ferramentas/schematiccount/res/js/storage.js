/*
 * Persistência no navegador (localStorage).
 * O servidor só processa arquivos; os projetos ficam aqui.
 *
 * Formato v2:
 * {
 *   version: 2,
 *   activeId: "p_xxx",
 *   order: ["p_xxx", ...],
 *   prefs: { status: "pending", sort: "total-desc" },
 *   projects: { "p_xxx": { id, name, createdAt, updatedAt, source, stats, warnings,
 *                          materials: [{ id, name, total, stack, got }] } }
 * }
 */
(function () {
    const KEY = "schematiccount.v2";
    const OLD_KEY = "schematic_count_projects"; // versão anterior do site

    function empty() {
        return { version: 2, activeId: null, order: [], prefs: { status: "pending", sort: "total-desc" }, projects: {} };
    }

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    }

    function newId() {
        return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    /** Converte os projetos salvos pela versão antiga: { nome: [{id,total,completed}] } */
    function migrateOld(raw) {
        const state = empty();
        let old;
        try { old = JSON.parse(raw); } catch { return state; }
        if (!old || typeof old !== "object") return state;

        for (const [name, list] of Object.entries(old)) {
            if (!Array.isArray(list)) continue;
            const id = newId();
            const materials = list
                .filter(m => m && m.id && m.total > 0)
                .map(m => ({
                    id: String(m.id),
                    name: SC.fmt.prettyName(m.id),
                    total: Number(m.total),
                    stack: String(m.id).includes("shulker_box") ? 1 : 64,
                    got: m.completed ? Number(m.total) : 0
                }));
            state.projects[id] = {
                id, name,
                createdAt: Date.now(), updatedAt: Date.now(),
                source: { format: "legacy" },
                stats: { types: materials.length, items: materials.reduce((a, m) => a + m.total, 0), blocks: null },
                warnings: [],
                materials
            };
            state.order.push(id);
        }
        state.activeId = state.order[0] || null;
        return state;
    }

    function load() {
        const raw = safeGet(KEY);
        if (raw) {
            try {
                const s = JSON.parse(raw);
                if (s && s.version === 2 && s.projects) {
                    s.order = (s.order || []).filter(id => s.projects[id]);
                    for (const id of Object.keys(s.projects)) if (!s.order.includes(id)) s.order.push(id);
                    s.prefs = Object.assign(empty().prefs, s.prefs || {});
                    // nomes salvos antes da correção do "(Converted Sponge)" do Litematica
                    for (const p of Object.values(s.projects)) {
                        const clean = String(p.name || "").replace(/\s*\(Converted (Sponge|Structure|Schematic)\)$/i, "").trim();
                        if (clean) p.name = clean;
                    }
                    return s;
                }
            } catch { /* cai para migração / vazio */ }
        }
        const old = safeGet(OLD_KEY);
        if (old) {
            const migrated = migrateOld(old);
            save(migrated);
            return migrated;
        }
        return empty();
    }

    let saveTimer = null;

    function save(state) {
        try {
            localStorage.setItem(KEY, JSON.stringify(state));
            return true;
        } catch (e) {
            console.error("SchematicCount: falha ao salvar", e);
            SC.ui && SC.ui.toast(SC.i18n.t("toast.storageFull"));
            return false;
        }
    }

    /** Salva no máximo a cada 300 ms (digitação nos campos de quantidade) */
    function saveSoon(state) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => save(state), 300);
    }

    window.addEventListener("beforeunload", () => {
        if (saveTimer) { clearTimeout(saveTimer); save(SC.state); }
    });

    SC.storage = { load, save, saveSoon, newId };
})();
