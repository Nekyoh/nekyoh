/* NEKYOH — Gerador de /give (formato certo para cada versão) */
(function () {
    "use strict";
    const { t, esc, icone, nomeItem, ITENS } = NK;
    const $ = (id) => document.getElementById(id);

    const MAX = { protection: 4, fire_protection: 4, blast_protection: 4, projectile_protection: 4, thorns: 3, respiration: 3, aqua_affinity: 1,
        swift_sneak: 3, feather_falling: 4, depth_strider: 3, frost_walker: 2, soul_speed: 3, sharpness: 5, smite: 5, bane_of_arthropods: 5,
        knockback: 2, fire_aspect: 2, looting: 3, sweeping_edge: 3, lunge: 3, density: 5, breach: 4, wind_burst: 3, efficiency: 5, silk_touch: 1,
        fortune: 3, power: 5, punch: 2, flame: 1, infinity: 1, multishot: 1, quick_charge: 3, piercing: 4, loyalty: 3, impaling: 5, riptide: 3,
        channeling: 1, luck_of_the_sea: 3, lure: 3, unbreaking: 3, mending: 1, binding_curse: 1, vanishing_curse: 1 };
    const ENCHS = Object.keys(MAX).sort((a, b) => t("ench.e." + a).localeCompare(t("ench.e." + b), NK.locale));
    const ROM = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

    let e = Object.assign({
        alvo: "@p", item: "diamond_sword", qtd: 1,
        nome: "", lore: "",
        enchs: [{ id: "sharpness", nivel: 5 }, { id: "unbreaking", nivel: 3 }], inq: false, brilho: false,
    }, {});
    // formato antigo: nome = {text, color…} e lore com uma cor só
    if (e.nome && typeof e.nome === "object") e.nome = NK.serializar([...(e.nome.text || "")].map((ch) => ({ ch, st: Object.assign({}, e.nome, { text: undefined }) })));
    if (e.loreCor) { e.lore = e.lore.split("\n").map((l) => l ? (NK.porNome[e.loreCor] ? "§" + NK.porNome[e.loreCor].codigo : "") + l : l).join("\n"); delete e.loreCor; }

    // ---- campos ----
    NK.editor($("nome"), { valor: e.nome, hex: true, placeholder: t("give.name_ph"), aoMudar: (v) => { e.nome = v; atualizar(); } });
    NK.editor($("lore"), { valor: e.lore, hex: true, multilinha: true, corPadrao: "#AA00AA", placeholder: t("give.lore_ph"), aoMudar: (v) => { e.lore = v; atualizar(); } });
    NK.buscaItem($("item"), { aoEscolher: (id) => { e.item = id; $("item").value = nomeItem(id); atualizar(); }, aoSair: () => { $("item").value = nomeItem(e.item); } });

    function renderEnchs() {
        $("enchs").innerHTML = e.enchs.map((x, i) =>
            '<li data-i="' + i + '"><select class="mc-input" data-campo="id">' +
            ENCHS.map((id) => '<option value="' + id + '"' + (id === x.id ? " selected" : "") + ">" + esc(t("ench.e." + id)) + "</option>").join("") +
            '</select><input class="mc-input" type="number" min="1" max="255" data-campo="nivel" value="' + x.nivel + '" aria-label="' + esc(t("give.level")) + '">' +
            '<button type="button" class="mc-btn mc-btn-sm pal-apagar" data-remover aria-label="' + esc(t("ui.remove")) + '">✕</button></li>').join("");
    }
    $("enchs").addEventListener("input", (ev) => {
        const li = ev.target.closest("[data-i]");
        if (!li) return;
        const x = e.enchs[+li.dataset.i];
        if (ev.target.dataset.campo === "id") { x.id = ev.target.value; x.nivel = MAX[x.id]; li.querySelector('[data-campo="nivel"]').value = x.nivel; }
        else x.nivel = Math.max(1, Math.min(255, parseInt(ev.target.value, 10) || 1));
        atualizar();
    });
    $("enchs").addEventListener("click", (ev) => {
        if (!ev.target.closest("[data-remover]")) return;
        e.enchs.splice(+ev.target.closest("[data-i]").dataset.i, 1);
        renderEnchs(); atualizar();
    });
    $("addEnch").addEventListener("click", () => {
        const usado = new Set(e.enchs.map((x) => x.id));
        const id = ENCHS.find((k) => !usado.has(k)) || "unbreaking";
        e.enchs.push({ id, nivel: MAX[id] }); renderEnchs(); atualizar();
    });

    // ---- monta o comando ----
    const vazio = (str) => !NK.analisar(str || "").length;
    function linhasLore() {
        const L = NK.linhasRico(e.lore || "");
        while (L.length && vazio(L[L.length - 1])) L.pop();
        return L;
    }

    function comando() {
        const v = NK.versao, id = "minecraft:" + e.item, alvo = e.alvo || "@p";
        const nomeOk = !vazio(e.nome);
        // nomes e descrições ficam em itálico no jogo; italic:false no 1º elemento tira isso (os trechos herdam)
        const semIt = { italic: false };
        const lore = linhasLore();
        const ench = e.enchs.filter((x) => x.id);

        if (v === "a" || v === "b") {
            const comp = [];
            const fmt = v === "a" ? (s2) => NK.compRico(s2, "snbt", semIt) : (s2) => NK.nbtAspasSimples(NK.compRico(s2, "json", semIt));
            if (nomeOk) comp.push("custom_name=" + fmt(e.nome));
            if (lore.length) comp.push("lore=[" + lore.map(fmt).join(",") + "]");
            if (ench.length) {
                const mapa = ench.map((x) => '"minecraft:' + x.id + '":' + x.nivel).join(",");
                comp.push(v === "a" ? "enchantments={" + mapa + "}" : "enchantments={levels:{" + mapa + "}}");
            }
            if (e.inq) comp.push("unbreakable={}");
            if (e.brilho) comp.push("enchantment_glint_override=true");
            return "/give " + alvo + " " + id + (comp.length ? "[" + comp.join(",") + "]" : "") + " " + e.qtd;
        }
        // 1.13 – 1.20.4: NBT
        const fmt = (s2) => NK.nbtAspasSimples(NK.compRico(s2, "json", semIt));
        const tag = [], disp = [];
        if (nomeOk) disp.push("Name:" + fmt(e.nome));
        if (lore.length) disp.push("Lore:[" + lore.map(fmt).join(",") + "]");
        if (disp.length) tag.push("display:{" + disp.join(",") + "}");
        if (ench.length) tag.push("Enchantments:[" + ench.map((x) => '{id:"minecraft:' + x.id + '",lvl:' + x.nivel + "s}").join(",") + "]");
        else if (e.brilho) tag.push("Enchantments:[{}]");
        if (e.inq) tag.push("Unbreakable:1b");
        return "/give " + alvo + " " + id + (tag.length ? "{" + tag.join(",") + "}" : "") + " " + e.qtd;
    }

    // ---- prévia (tooltip do inventário) ----
    function previa() {
        $("slotItem").innerHTML = icone(e.item, nomeItem(e.item), 28);
        $("slotGrande").innerHTML = icone(e.item, nomeItem(e.item), 48) + (e.qtd > 1 ? "<b>" + e.qtd + "</b>" : "");
        $("slotGrande").classList.toggle("brilha", e.enchs.length > 0 || e.brilho);
        let h = '<div class="gv-l">' + (vazio(e.nome) ? NK.spanEstilo(nomeItem(e.item), { color: e.enchs.length ? "aqua" : "white" }) : NK.renderCodigos(e.nome, "§", "#FFFFFF")) + "</div>";
        e.enchs.forEach((x) => {
            const cor = x.id.includes("curse") ? "red" : "gray";
            const nv = MAX[x.id] === 1 && x.nivel === 1 ? "" : " " + (ROM[x.nivel] || x.nivel);
            h += '<div class="gv-l">' + NK.spanEstilo(t("ench.e." + x.id) + nv, { color: cor }) + "</div>";
        });
        linhasLore().forEach((s2) => { h += '<div class="gv-l">' + (vazio(s2) ? "&nbsp;" : NK.renderCodigos(s2, "§", "#AA00AA")) + "</div>"; });
        if (e.inq) h += '<div class="gv-l">' + NK.spanEstilo(t("give.unbreakable"), { color: "blue" }) + "</div>";
        h += '<div class="gv-l gv-id">minecraft:' + esc(e.item) + "</div>";
        $("tip").innerHTML = h;
    }

    function atualizar() {
        e.alvo = $("alvo").value.trim();
        e.qtd = Math.max(1, Math.min(99, parseInt($("qtd").value, 10) || 1));
        e.inq = $("inq").checked; e.brilho = $("brilho").checked;
        NK.mostrarComando($("cmd"), comando());
        previa();
    }

    $("alvo").value = e.alvo; $("qtd").value = e.qtd;
    $("inq").checked = e.inq; $("brilho").checked = e.brilho; $("item").value = nomeItem(e.item);
    ["alvo", "qtd"].forEach((id) => $(id).addEventListener("input", atualizar));
    ["inq", "brilho"].forEach((id) => $(id).addEventListener("change", atualizar));
    NK.onVersao(atualizar);
    renderEnchs();
    atualizar();
})();
