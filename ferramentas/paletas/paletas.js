/* NEKYOH — Paletas de Blocos */
(function () {
    "use strict";
    const { t, esc, icone, nomeItem, ITENS } = NK;
    const PRONTAS = (window.NK_DADOS.paletas || []);
    const MAX = 9;


    const $ = (id) => document.getElementById(id);
    const grelha = $("grelha"), weDica = $("weDica");
    let filtro = "todas";
    let minhas = NK.ler("paletas", []);
    let editor = { id: null, nome: "", blocos: [] };

    const padraoWE = (blocos) => blocos.join(",");

    function slotsHTML(blocos) {
        return blocos.map((b) => '<span class="slot-p" data-tip="' + esc(nomeItem(b)) + '">' + icone(b, nomeItem(b), 30) + "</span>").join("");
    }

    function cartao(p, minha) {
        const nomes = p.blocos.map(nomeItem);
        return '<article class="painel pal-cartao' + (p.tipo === "gradiente" ? " grad" : "") + '" data-id="' + esc(p.id) + '">' +
            '<header><h3>' + esc(p.nome) + "</h3><span>" + esc(t("pal.count", { n: p.blocos.length })) + "</span></header>" +
            '<div class="pal-linha">' + slotsHTML(p.blocos) + "</div>" +
            '<p class="pal-nomes">' + nomes.map(esc).join(" · ") + "</p>" +
            '<div class="pal-acoes">' +
            '<button type="button" class="mc-btn mc-btn-sm" data-acao="nomes">' + esc(t("pal.copy_names")) + "</button>" +
            '<button type="button" class="mc-btn mc-btn-sm mc-btn-alt" data-acao="we" title="' + esc(padraoWE(p.blocos)) + '">' + esc(t("pal.copy_we")) + "</button>" +
            (minha ? '<button type="button" class="mc-btn mc-btn-sm" data-acao="editar">' + esc(t("pal.edit")) + "</button>" +
                     '<button type="button" class="mc-btn mc-btn-sm pal-apagar" data-acao="apagar">' + esc(t("pal.delete")) + "</button>" : "") +
            "</div></article>";
    }

    function render() {
        document.querySelectorAll(".pal-filtros [data-filtro]").forEach((b) => b.setAttribute("aria-selected", b.dataset.filtro === filtro));
        let html = "";
        if (filtro === "minhas" || filtro === "todas") html += minhas.map((p) => cartao(p, true)).join("");
        if (filtro !== "minhas") html += PRONTAS.filter((p) => filtro === "todas" || p.tipo === filtro).map((p) => cartao(p, false)).join("");
        if (!html) html = '<p class="vazio">' + esc(t("pal.empty_mine")) + "</p>";
        grelha.innerHTML = html;
        weDica.textContent = t("pal.we_hint", { p: "stone_bricks,cobblestone,mossy_cobblestone" });
    }

    function acharPaleta(id) {
        return minhas.find((p) => p.id === id) || PRONTAS.find((p) => p.id === id);
    }

    document.querySelector(".pal-filtros").addEventListener("click", (e) => {
        const b = e.target.closest("[data-filtro]");
        if (b) { filtro = b.dataset.filtro; render(); }
    });

    grelha.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-acao]");
        if (!b) return;
        const p = acharPaleta(b.closest(".pal-cartao").dataset.id);
        if (!p) return;
        const acao = b.dataset.acao;
        if (acao === "nomes" || acao === "we") {
            const ok = await NK.copiarTexto(acao === "we" ? padraoWE(p.blocos) : p.blocos.map(nomeItem).join("\n"));
            const orig = b.textContent; b.textContent = ok ? t("ui.copied") : "✗";
            setTimeout(() => { b.textContent = orig; }, 1300);
        } else if (acao === "editar") {
            editor = { id: p.id, nome: p.nome, blocos: p.blocos.slice() };
            renderEditor(); $("edNome").focus();
            $("editor").scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (acao === "apagar") {
            minhas = minhas.filter((x) => x.id !== p.id);
            NK.guardar("paletas", minhas); render();
        }
    });

    // ---------------- editor ----------------
    const edSlots = $("edSlots"), edBusca = $("edBusca"), edNome = $("edNome"), edNota = $("edNota");
    let arrastando = null;

    function renderEditor() {
        edNome.value = editor.nome;
        $("edTitulo").textContent = editor.id ? editor.nome || t("pal.new") : t("pal.new");
        let html = "";
        for (let i = 0; i < MAX; i++) {
            const b = editor.blocos[i];
            html += b
                ? '<button type="button" class="slot-p cheio" draggable="true" data-i="' + i + '" data-tip="' + esc(nomeItem(b)) + '">' + icone(b, nomeItem(b), 30) + "</button>"
                : '<span class="slot-p"></span>';
        }
        edSlots.innerHTML = html;
    }

    function adicionar(id) {
        if (editor.blocos.length >= MAX || editor.blocos.includes(id)) return;
        editor.blocos.push(id);
        edBusca.value = "";
        renderEditor();
    }
    NK.buscaItem(edBusca, { ids: Object.keys(ITENS), aoEscolher: (id) => { adicionar(id); setTimeout(() => edBusca.focus(), 0); }, aoSair: () => { edBusca.value = ""; } });
    edNome.addEventListener("input", () => { editor.nome = edNome.value; });

    edSlots.addEventListener("click", (e) => {
        const b = e.target.closest(".cheio");
        if (!b) return;
        editor.blocos.splice(+b.dataset.i, 1);
        renderEditor();
    });
    edSlots.addEventListener("dragstart", (e) => { const b = e.target.closest(".cheio"); if (b) arrastando = +b.dataset.i; });
    edSlots.addEventListener("dragover", (e) => e.preventDefault());
    edSlots.addEventListener("drop", (e) => {
        e.preventDefault();
        const alvo = e.target.closest("[data-i]");
        if (arrastando === null || !alvo) return;
        const [b] = editor.blocos.splice(arrastando, 1);
        editor.blocos.splice(+alvo.dataset.i, 0, b);
        arrastando = null; renderEditor();
    });

    $("edLimpar").addEventListener("click", () => { editor = { id: null, nome: "", blocos: [] }; renderEditor(); });
    $("edSalvar").addEventListener("click", () => {
        if (!editor.blocos.length) { edBusca.focus(); return; }
        const nome = editor.nome.trim() || t("pal.new") + " " + (minhas.length + 1);
        if (editor.id && minhas.some((p) => p.id === editor.id)) {
            minhas = minhas.map((p) => p.id === editor.id ? { id: p.id, nome, tipo: "minha", blocos: editor.blocos.slice() } : p);
        } else {
            minhas.unshift({ id: "m" + Date.now(), nome, tipo: "minha", blocos: editor.blocos.slice() });
        }
        NK.guardar("paletas", minhas);
        editor = { id: null, nome: "", blocos: [] };
        renderEditor();
        filtro = "minhas"; render();
        edNota.textContent = t("pal.saved");
        setTimeout(() => { edNota.textContent = t("pal.max"); }, 1600);
    });

    renderEditor();
    render();
})();
