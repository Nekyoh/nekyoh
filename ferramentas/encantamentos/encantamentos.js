/* NEKYOH — Encantamentos: compatibilidade, ordem na bigorna e XP (Java Edition) */
(function () {
    "use strict";
    const { t, esc, icone, nomeItem } = NK;
    const $ = (id) => document.getElementById(id);

    // ---------------- dados ----------------
    // itens → grupo
    const ITENS = [
        ["diamond_sword", "sword"], ["diamond_axe", "axe"], ["diamond_pickaxe", "pickaxe"], ["diamond_shovel", "shovel"],
        ["diamond_hoe", "hoe"], ["diamond_spear", "spear"], ["mace", "mace"], ["trident", "trident"], ["bow", "bow"],
        ["crossbow", "crossbow"], ["diamond_helmet", "helmet"], ["diamond_chestplate", "chest"], ["diamond_leggings", "legs"],
        ["diamond_boots", "boots"], ["elytra", "elytra"], ["fishing_rod", "rod"], ["shears", "shears"], ["shield", "shield"],
        ["flint_and_steel", "flint"], ["enchanted_book", "book"],
    ];
    const ARMOR = ["helmet", "chest", "legs", "boots"];
    const TODOS = ITENS.map((i) => i[1]);
    // id: [nível máx, multiplicador item, multiplicador livro, grupos]  (conferido com minecraft-data 26.1)
    const E = {
        protection: [4, 1, 1, ARMOR], fire_protection: [4, 2, 1, ARMOR], blast_protection: [4, 4, 2, ARMOR], projectile_protection: [4, 2, 1, ARMOR],
        thorns: [3, 8, 4, ARMOR], respiration: [3, 4, 2, ["helmet"]], aqua_affinity: [1, 4, 2, ["helmet"]], swift_sneak: [3, 8, 4, ["legs"]],
        feather_falling: [4, 2, 1, ["boots"]], depth_strider: [3, 4, 2, ["boots"]], frost_walker: [2, 4, 2, ["boots"]], soul_speed: [3, 8, 4, ["boots"]],
        sharpness: [5, 1, 1, ["sword", "axe", "spear"]], smite: [5, 2, 1, ["sword", "axe", "mace", "spear"]],
        bane_of_arthropods: [5, 2, 1, ["sword", "axe", "mace", "spear"]], knockback: [2, 2, 1, ["sword", "spear"]],
        fire_aspect: [2, 4, 2, ["sword", "mace", "spear"]], looting: [3, 4, 2, ["sword", "spear"]], sweeping_edge: [3, 4, 2, ["sword"]],
        lunge: [3, 2, 1, ["spear"]], density: [5, 2, 1, ["mace"]], breach: [4, 4, 2, ["mace"]], wind_burst: [3, 4, 2, ["mace"]],
        efficiency: [5, 1, 1, ["axe", "pickaxe", "shovel", "hoe", "shears"]], silk_touch: [1, 8, 4, ["axe", "pickaxe", "shovel", "hoe"]],
        fortune: [3, 4, 2, ["axe", "pickaxe", "shovel", "hoe"]],
        power: [5, 1, 1, ["bow"]], punch: [2, 4, 2, ["bow"]], flame: [1, 4, 2, ["bow"]], infinity: [1, 8, 4, ["bow"]],
        multishot: [1, 4, 2, ["crossbow"]], quick_charge: [3, 2, 1, ["crossbow"]], piercing: [4, 1, 1, ["crossbow"]],
        loyalty: [3, 2, 1, ["trident"]], impaling: [5, 4, 2, ["trident"]], riptide: [3, 4, 2, ["trident"]], channeling: [1, 8, 4, ["trident"]],
        luck_of_the_sea: [3, 4, 2, ["rod"]], lure: [3, 4, 2, ["rod"]],
        unbreaking: [3, 2, 1, TODOS], mending: [1, 4, 2, TODOS],
        binding_curse: [1, 8, 4, ARMOR.concat(["elytra"])], vanishing_curse: [1, 8, 4, TODOS],
    };
    const EXCLUSIVOS = [
        ["protection", "fire_protection", "blast_protection", "projectile_protection"],
        ["sharpness", "smite", "bane_of_arthropods", "density", "breach", "impaling"],
        ["depth_strider", "frost_walker"], ["silk_touch", "fortune"], ["infinity", "mending"],
        ["multishot", "piercing"], ["riptide", "loyalty"], ["riptide", "channeling"],
    ];
    const conflitam = (a, b) => a !== b && EXCLUSIVOS.some((g) => g.includes(a) && g.includes(b));
    const ROMANO = ["", "I", "II", "III", "IV", "V"];
    const nomeE = (id) => t("ench.e." + id);

    // ---------------- estado ----------------
    let st = Object.assign({ item: "diamond_sword", sel: {} }, {});
    const grupo = () => (ITENS.find((i) => i[0] === st.item) || ITENS[0])[1];
    const aplicaveis = () => Object.keys(E).filter((id) => grupo() === "book" || E[id][3].includes(grupo()));

    // ---------------- itens ----------------
    $("itens").innerHTML = ITENS.map(([id]) =>
        '<button type="button" class="slot-p" data-item="' + id + '" data-tip="' + esc(nomeItem(id)) + '">' + icone(id, nomeItem(id), 28) + "</button>").join("");
    $("itens").addEventListener("click", (e) => {
        const b = e.target.closest("[data-item]");
        if (!b) return;
        st.item = b.dataset.item;
        const ok = aplicaveis();
        Object.keys(st.sel).forEach((k) => { if (!ok.includes(k)) delete st.sel[k]; });
        render();
    });

    // ---------------- lista de encantamentos ----------------
    function renderLista() {
        const marcados = Object.keys(st.sel);
        $("lista").innerHTML = aplicaveis().map((id) => {
            const [max] = E[id];
            const marcado = !!st.sel[id];
            const contra = marcados.filter((m) => conflitam(m, id));
            const bloqueado = !marcado && contra.length > 0;
            const tip = bloqueado ? ' data-tip="' + esc(t("ench.conflict", { a: contra.map(nomeE).join(", ") })) + '"' : "";
            let niveis = "";
            for (let n = 1; n <= max; n++) niveis += '<option value="' + n + '"' + ((st.sel[id] || max) === n ? " selected" : "") + ">" + ROMANO[n] + "</option>";
            return '<li class="' + (bloqueado ? "bloq" : "") + (id.includes("curse") ? " maldicao" : "") + '"' + tip + ">" +
                '<label class="marcar"><input type="checkbox" data-ench="' + id + '"' + (marcado ? " checked" : "") + (bloqueado ? " disabled" : "") + "> " + esc(nomeE(id)) + "</label>" +
                (max > 1 ? '<select class="mc-input ench-nivel" data-nivel="' + id + '" aria-label="' + esc(t("ench.level")) + '"' + (bloqueado ? " disabled" : "") + ">" + niveis + "</select>" : '<span class="ench-nivel-fixo">I</span>') +
                "</li>";
        }).join("");
    }
    $("lista").addEventListener("change", (e) => {
        const c = e.target.closest("[data-ench]"), n = e.target.closest("[data-nivel]");
        if (c) {
            if (c.checked) {
                const sel = $("lista").querySelector('[data-nivel="' + c.dataset.ench + '"]');
                st.sel[c.dataset.ench] = sel ? parseInt(sel.value, 10) : 1;
            } else delete st.sel[c.dataset.ench];
            render();
        }
        if (n) { if (st.sel[n.dataset.nivel] !== undefined) { st.sel[n.dataset.nivel] = parseInt(n.value, 10); render(); } }
    });

    // ---------------- ordem ótima na bigorna (busca completa por subconjuntos) ----------------
    function planejar(livros, limite) {
        const n = livros.length + 1;           // elemento 0 = item
        const FULL = (1 << n) - 1;
        const valor = new Array(1 << n).fill(0);
        for (let m = 1; m <= FULL; m++) {
            let v = 0;
            for (let i = 1; i < n; i++) if (m & (1 << i)) v += livros[i - 1].valor;
            valor[m] = v;
        }
        const dp = new Array(1 << n);
        for (let i = 0; i < n; i++) dp[1 << i] = { 0: { custo: 0, maior: 0, passos: [] } };
        const masks = [];
        for (let m = 1; m <= FULL; m++) if (m & (m - 1)) masks.push(m);
        masks.sort((a, b) => popc(a) - popc(b));
        for (const m of masks) {
            const melhor = {};
            for (let L = (m - 1) & m; L > 0; L = (L - 1) & m) {
                const R = m ^ L;
                if (m & 1) { if (!(L & 1)) continue; }      // o item fica sempre à esquerda
                else if (L > R) continue;                    // livro+livro: evita repetir o par
                const dl = dp[L], dr = dp[R];
                if (!dl || !dr) continue;
                for (const pa in dl) for (const pb in dr) {
                    const a = dl[pa], b = dr[pb];
                    // em livro+livro, testa as duas ordens (o da direita é o sacrificado)
                    const ordens = (m & 1) ? [[L, R, a, b, +pa, +pb]] : [[L, R, a, b, +pa, +pb], [R, L, b, a, +pb, +pa]];
                    for (const [x, y, A, B, px, py] of ordens) {
                        const passo = valor[y] + (2 ** px - 1) + (2 ** py - 1);
                        if (passo > limite) continue;
                        const pen = Math.max(px, py) + 1;
                        const custo = A.custo + B.custo + passo;
                        if (!melhor[pen] || custo < melhor[pen].custo) {
                            melhor[pen] = { custo, maior: Math.max(A.maior, B.maior, passo),
                                passos: A.passos.concat(B.passos, [{ esq: x, dir: y, custo: passo }]) };
                        }
                    }
                }
            }
            if (Object.keys(melhor).length) dp[m] = melhor;
        }
        const fim = dp[FULL];
        if (!fim) return null;
        return Object.values(fim).sort((a, b) => a.custo - b.custo)[0];
    }
    const popc = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

    function rotulo(mask, livros) {
        const nomes = [];
        for (let i = 1; i <= livros.length; i++) if (mask & (1 << i)) nomes.push(nomeE(livros[i - 1].id) + " " + ROMANO[livros[i - 1].nivel]);
        const item = mask & 1;
        return (item ? '<span class="ench-item">' + icone(st.item, "I", 20) + esc(nomeItem(st.item)) + "</span>" : '<span class="ench-livro">' + icone("enchanted_book", "L", 20) + "</span>") +
            (nomes.length ? '<span class="ench-nomes">' + (item ? " (" : "") + esc(nomes.join(", ")) + (item ? ")" : "") + "</span>" : "");
    }

    function renderPlano() {
        const ids = Object.keys(st.sel);
        const conflitos = [];
        ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => { if (conflitam(a, b)) conflitos.push(nomeE(a) + " × " + nomeE(b)); }));
        const status = $("status");
        if (!ids.length) { status.textContent = t("ench.none_sel"); status.className = "ench-status"; }
        else if (conflitos.length) { status.textContent = t("ench.conflicts_found", { a: conflitos.join("; ") }); status.className = "ench-status erro"; }
        else { status.textContent = t("ench.ok"); status.className = "ench-status ok"; }

        const livros = ids.map((id) => ({ id, nivel: st.sel[id], valor: st.sel[id] * E[id][2] }));
        $("caro").hidden = true;
        if (!livros.length) { $("passos").innerHTML = ""; $("total").textContent = ""; return; }
        if (livros.length > 10) { $("passos").innerHTML = '<li class="vazio">' + esc(t("ench.max_books")) + "</li>"; $("total").textContent = ""; return; }
        let plano = planejar(livros, 39);
        if (!plano) { plano = planejar(livros, 9999); $("caro").hidden = false; }
        $("passos").innerHTML = plano.passos.map((p, i) =>
            '<li><small>' + esc(t("ench.step", { n: i + 1 })) + "</small><div class=\"ench-passo\">" + rotulo(p.esq, livros) +
            ' <b class="ench-mais">+</b> ' + rotulo(p.dir, livros) + "</div>" +
            '<span class="ench-custo' + (p.custo > 39 ? " caro" : "") + '">' + esc(t("ench.cost", { n: p.custo })) + "</span></li>").join("");
        $("total").textContent = t("ench.total", { n: plano.custo });
    }

    function render() {
        document.querySelectorAll("[data-item]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.item === st.item));
        $("nomeItem").textContent = nomeItem(st.item);
        renderLista();
        renderPlano();
    }

    // ---------------- XP ----------------
    const total = (L) => L <= 16 ? L * L + 6 * L : L <= 31 ? 2.5 * L * L - 40.5 * L + 360 : 4.5 * L * L - 162.5 * L + 2220;
    const proximo = (L) => L <= 15 ? 2 * L + 7 : L <= 30 ? 5 * L - 38 : 9 * L - 158;
    function nivelDe(p) {
        let L = 0;
        while (total(L + 1) <= p) L++;
        return { nivel: L, sobra: p - total(L) };
    }
    function renderXP() {
        const a = Math.max(0, parseInt($("nivA").value, 10) || 0), b = Math.max(0, parseInt($("nivB").value, 10) || 0);
        const lo = Math.min(a, b), hi = Math.max(a, b);
        const precisa = total(hi) - total(lo);
        $("xpPrecisa").textContent = NK.num(precisa);
        $("xpFrascos").textContent = "≈ " + NK.num(Math.ceil(precisa / 7));
        $("xpTotalRot").textContent = t("ench.total_pts", { n: hi });
        $("xpTotal").textContent = NK.num(total(hi));
        $("xpNivel").textContent = hi;
        $("xpFill").style.width = Math.min(100, (lo / Math.max(hi, 1)) * 100) + "%";
        $("mesa").textContent = t("ench.table_hint", { n: NK.num(total(30) - total(27)) });

        const p = Math.max(0, parseInt($("pontos").value, 10) || 0);
        const r = nivelDe(p);
        $("pontosRes").innerHTML = "<b>" + esc(t("ench.level_of")) + " " + r.nivel + "</b> " + esc(t("ench.levels_left", { n: NK.num(r.sobra) })) +
            " · " + esc(t("ench.next", { n: r.nivel, m: r.nivel + 1 })) + ": " + NK.num(proximo(r.nivel));

        const marcos = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
        $("tabela").innerHTML = "<tr><th>" + esc(t("ench.level")) + "</th><th>" + esc(t("ench.need")) + "</th><th>Σ</th></tr>" +
            marcos.map((L) => "<tr><td>" + L + "</td><td>" + NK.num(proximo(L)) + "</td><td>" + NK.num(total(L)) + "</td></tr>").join("");
    }
    ["nivA", "nivB", "pontos"].forEach((id) => $(id).addEventListener("input", renderXP));

    NK.abas($("abas"));
    render();
    renderXP();
})();
