/* NEKYOH — Conversor de ticks + hora do dia */
(function () {
    "use strict";
    const { t } = NK;
    const $ = (id) => document.getElementById(id);
    // quantos ticks de jogo vale 1 unidade
    const FATOR = { gt: 1, rt: 2, s: 20, min: 1200, h: 72000, dia: 24000 };
    let e = Object.assign({ valor: 20, unidade: "gt", tempo: 1000 }, {});

    function conv() {
        const v = Math.max(0, parseFloat($("valor").value) || 0);
        e.valor = v; e.unidade = $("unidade").value;
        const gt = v * FATOR[e.unidade];
        document.querySelectorAll("#numeros [data-u]").forEach((el) => {
            const u = el.dataset.u;
            el.classList.toggle("principal", u === e.unidade);
            el.querySelector("strong").textContent = NK.num2(gt / FATOR[u]);
        });
    }

    // repetidor: 1–4 cliques
    $("repetidor").innerHTML = [1, 2, 3, 4].map((n) =>
        '<button type="button" class="mc-btn mc-btn-sm" data-rt="' + n + '"><b>' + n + " rt</b><span>" + (n * 2) + " gt</span><span>" + NK.num2(n / 10) + " s</span></button>").join("");
    $("repetidor").addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-rt]");
        if (!b) return;
        $("valor").value = b.dataset.rt; $("unidade").value = "rt"; conv();
    });

    function fase(tm) {
        if (tm >= 23000 || tm < 1000) return "amanhecer";
        if (tm >= 5000 && tm < 7000) return "meio_dia";
        if (tm < 12000) return "dia";
        if (tm < 13000) return "entardecer";
        if (tm >= 17000 && tm < 19000) return "meia_noite";
        return "noite";
    }
    function relogio() {
        const tm = parseInt($("tempo").value, 10);
        e.tempo = tm;
        const minutos = Math.floor(((tm / 1000 + 6) % 24) * 60);
        $("hora").textContent = String(Math.floor(minutos / 60)).padStart(2, "0") + ":" + String(minutos % 60).padStart(2, "0");
        $("tempoN").textContent = NK.num(tm);
        $("fase").textContent = t("ticks.phase." + fase(tm));
        const flags = [];
        if (tm >= 13188 && tm <= 22812) flags.push("☾ " + t("ticks.mobs"));
        if (tm >= 12542 && tm <= 23459) flags.push("▣ " + t("ticks.sleep"));
        $("flags").textContent = flags.join(" · ");
        // sol e lua giram em volta do céu
        const ang = (tm / 24000) * 2 * Math.PI;   // 0 = nascer (leste)
        const sx = 50 - Math.cos(ang) * 40, sy = 85 - Math.sin(ang) * 70;
        $("sol").style.left = sx + "%"; $("sol").style.top = sy + "%";
        $("luaMini").style.left = (100 - sx) + "%"; $("luaMini").style.top = (170 - sy) + "%";
        const noite = tm >= 13000 && tm <= 23000;
        $("ceuMini").classList.toggle("noite", noite);
        $("ceuMini").classList.toggle("transicao", (tm >= 11800 && tm < 13000) || (tm >= 22500 || tm < 300));
        NK.mostrarComando($("tempoCmd"), "/time set " + tm);
        document.querySelectorAll("[data-tempo]").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.tempo === tm));
    }
    $("atalhos").addEventListener("click", (ev) => { const b = ev.target.closest("[data-tempo]"); if (b) { $("tempo").value = b.dataset.tempo; relogio(); } });

    $("valor").value = e.valor; $("unidade").value = e.unidade; $("tempo").value = e.tempo;
    $("valor").addEventListener("input", conv); $("unidade").addEventListener("change", conv);
    $("tempo").addEventListener("input", relogio);
    conv(); relogio();
})();
