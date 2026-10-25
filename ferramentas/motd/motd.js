/* NEKYOH — Gerador de MOTD (cor por palavra) */
(function () {
    "use strict";
    const { t } = NK;
    const $ = (id) => document.getElementById(id);
    let e = Object.assign({ l1: t("motd.ph1"), l2: t("motd.ph2"), nome: "Nekyoh Server", jog: "12/100" }, {});
    // versões antigas guardavam com "&"
    ["l1", "l2"].forEach((k) => { e[k] = String(e[k] || "").replace(/&([0-9a-fk-or])/gi, "§$1").replace(/§#[0-9a-f]{6}/gi, ""); });

    const ed1 = NK.editor($("l1"), { valor: e.l1, hex: false, corPadrao: "#AAAAAA", aoMudar: (v) => { e.l1 = v; atualizar(); } });
    const ed2 = NK.editor($("l2"), { valor: e.l2, hex: false, corPadrao: "#AAAAAA", aoMudar: (v) => { e.l2 = v; atualizar(); } });

    function escaparProps(s) {
        let out = "";
        for (const ch of s) {
            const c = ch.codePointAt(0);
            if (ch === "\\") out += "\\\\";
            else if (c > 126) out += c > 0xffff ? ch : "\\u" + c.toString(16).toUpperCase().padStart(4, "0");
            else out += ch;
        }
        return out;
    }

    function atualizar() {
        e.nome = $("nome").value; e.jog = $("jog").value;
        $("pNome").textContent = e.nome;
        $("pJog").textContent = e.jog;
        $("p1").innerHTML = NK.renderCodigos(e.l1, "§", "#AAAAAA");
        $("p2").innerHTML = NK.renderCodigos(e.l2, "§", "#AAAAAA");
        const w1 = NK.largura(e.l1), w2 = NK.largura(e.l2);
        $("larguras").innerHTML = [[1, w1], [2, w2]].map(([n, w]) =>
            '<span class="' + (w > 270 ? "alerta" : "") + '">' + NK.esc(t("motd.width", { n, w })) + (w > 270 ? " — " + NK.esc(t("motd.too_wide")) : "") + "</span>").join("<br>");
        NK.mostrarComando($("outProps"), "motd=" + escaparProps(e.l1) + (e.l2 ? "\\n" + escaparProps(e.l2) : ""));
        NK.mostrarComando($("outAmp"), '"' + (e.l1 + (e.l2 ? "\\n" + e.l2 : "")).replace(/§/g, "&").replace(/"/g, '\\"') + '"');
        NK.mostrarComando($("outRaw"), e.l1 + (e.l2 ? "\n" + e.l2 : ""));
    }

    // centralizar: espaços (4 px) sem formatação no começo de cada linha
    $("centrar").addEventListener("click", () => {
        [[ed1, "l1"], [ed2, "l2"]].forEach(([ed, k]) => {
            const chars = NK.analisar(e[k]);
            while (chars.length && chars[0].ch === " ") chars.shift();
            const pad = Math.max(0, Math.floor((270 - NK.largura(NK.serializar(chars))) / 2 / 4));
            ed.definir(NK.serializar(Array.from({ length: pad }, () => ({ ch: " ", st: {} })).concat(chars)));
        });
    });

    $("icone").addEventListener("change", () => { const f = $("icone").files[0]; if (f) $("iconeImg").src = URL.createObjectURL(f); });
    $("nome").value = e.nome; $("jog").value = e.jog;
    ["nome", "jog"].forEach((id) => $(id).addEventListener("input", atualizar));
    atualizar();
})();
