/* NEKYOH — Gerador de /title (cor por palavra) */
(function () {
    "use strict";
    const { t } = NK;
    const $ = (id) => document.getElementById(id);
    let e = Object.assign({
        alvo: "@a", fadein: 10, stay: 70, fadeout: 20,
        title: "§6§l" + t("title.ph_title"), subtitle: "§b" + t("title.ph_sub"), actionbar: "",
    }, {});
    // formato antigo (objeto com estilo único) → texto com códigos
    ["title", "subtitle", "actionbar"].forEach((k) => {
        if (e[k] && typeof e[k] === "object") e[k] = NK.serializar([...(e[k].text || "")].map((ch) => ({ ch, st: Object.assign({}, e[k], { text: undefined }) })));
    });

    document.querySelectorAll("[data-bloco]").forEach((el) => {
        const k = el.dataset.bloco;
        NK.editor(el, { valor: e[k], hex: true, aoMudar: (v) => { e[k] = v; atualizar(); } });
    });

    const ticks = (id) => Math.max(0, parseInt($(id).value, 10) || 0);
    const vazio = (s) => !NK.analisar(s).length;

    function atualizar() {
        e.alvo = $("alvo").value.trim() || "@a";
        ["fadein", "stay", "fadeout"].forEach((k) => { e[k] = ticks(k); $("s_" + k).textContent = t("title.secs", { n: NK.num2(e[k] / 20) }); });
        $("pTitle").innerHTML = NK.renderCodigos(e.title, "§", "#FFFFFF");
        $("pSub").innerHTML = NK.renderCodigos(e.subtitle, "§", "#FFFFFF");
        $("pBar").innerHTML = NK.renderCodigos(e.actionbar, "§", "#FFFFFF");

        const L = [];
        const temTitulo = !vazio(e.title) || !vazio(e.subtitle);
        if (temTitulo) L.push("/title " + e.alvo + " times " + e.fadein + " " + e.stay + " " + e.fadeout);
        if (!vazio(e.subtitle)) L.push("/title " + e.alvo + " subtitle " + NK.compRico(e.subtitle, "json"));
        if (temTitulo) L.push("/title " + e.alvo + " title " + NK.compRico(e.title, "json"));
        if (!vazio(e.actionbar)) L.push("/title " + e.alvo + " actionbar " + NK.compRico(e.actionbar, "json"));
        NK.mostrarComando($("cmds"), L.join("\n"));
    }

    let anim = null;
    $("play").addEventListener("click", () => {
        if (anim) anim.cancel();
        const total = (e.fadein + e.stay + e.fadeout) * 50;
        if (!total) return;
        const fi = e.fadein * 50 / total, fo = (e.fadein + e.stay) * 50 / total;
        anim = $("titulos").animate([{ opacity: e.fadein ? 0 : 1, offset: 0 }, { opacity: 1, offset: fi }, { opacity: 1, offset: fo }, { opacity: 0, offset: 1 }], { duration: total });
        $("pBar").animate([{ opacity: 1 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: Math.max(total, 3000) });
    });

    $("alvo").value = e.alvo;
    ["fadein", "stay", "fadeout"].forEach((k) => { $(k).value = e[k]; $(k).addEventListener("input", atualizar); });
    $("alvo").addEventListener("input", atualizar);
    atualizar();
})();
