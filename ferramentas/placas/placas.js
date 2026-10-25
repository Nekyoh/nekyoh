/* NEKYOH — Gerador de placas (cor por palavra + visual de madeira do jogo) */
(function () {
    "use strict";
    const { t, esc } = NK;
    const $ = (id) => document.getElementById(id);
    const ph = t("sign.ph");
    let e = Object.assign({
        madeira: "oak", tipo: "sign", corante: "black", rot: 8, brilho: false, cera: false, atras: false,
        linhas: ["", Array.isArray(ph) ? ph[1] : "", "§6§l" + (Array.isArray(ph) ? ph[2] : ""), ""],
    }, {});
    // formato antigo: [{text, color, bold…}] → texto com códigos
    e.linhas = e.linhas.map((L) => typeof L === "string" ? L :
        NK.serializar([...(L.text || "")].map((ch) => ({ ch, st: Object.assign({}, L, { text: undefined }) }))));

    // ---------------- cores ----------------
    // [tábua clara, tábua, tábua escura, contorno, poste]
    const MADEIRA = {
        oak: ["#b8945f", "#a2834f", "#7e6237", "#4f3f22", "#6b5232"], spruce: ["#82613a", "#725430", "#5a3d20", "#3a2714", "#4a331c"],
        birch: ["#d7c185", "#c4b17a", "#a8955c", "#6e603a", "#8a7a4c"], jungle: ["#b88764", "#a0734d", "#7f5639", "#4e3423", "#6b4a32"],
        acacia: ["#ba6337", "#a85a32", "#8b4524", "#552a15", "#6e4030"], dark_oak: ["#53351d", "#42291a", "#331f12", "#1f130b", "#2c1c10"],
        mangrove: ["#8b4440", "#763633", "#5e2826", "#3a1716", "#4c2321"], cherry: ["#efc8c0", "#e2b4ab", "#c99a92", "#8e605a", "#a2706a"],
        pale_oak: ["#f0e8e3", "#e3d9d3", "#c9bcb5", "#8a7d77", "#a99c96"], bamboo: ["#dcc864", "#c9b553", "#a6923a", "#6a5c20", "#8a7a2c"],
        crimson: ["#7e3a56", "#6b344c", "#542639", "#33151f", "#47202e"], warped: ["#3a8480", "#2b6963", "#1f514d", "#10302d", "#1c4541"],
    };
    const CORANTE = { white: 0xFFFFFF, orange: 0xFF681F, magenta: 0xFF00FF, light_blue: 0x9AC0CD, yellow: 0xFFFF00, lime: 0xBFFF00, pink: 0xFF69B4,
        gray: 0x808080, light_gray: 0xD3D3D3, cyan: 0x00FFFF, purple: 0xA020F0, blue: 0x0000FF, brown: 0x8B4513, green: 0x00FF00, red: 0xFF0000, black: 0x000000 };
    const hex = (n) => "#" + n.toString(16).padStart(6, "0");
    const escuro = (n) => hex((Math.floor(((n >> 16) & 255) * 0.4) << 16) | (Math.floor(((n >> 8) & 255) * 0.4) << 8) | Math.floor((n & 255) * 0.4));

    // ---------------- textura de tábuas (pixel art gerada) ----------------
    function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t2 = Math.imul(seed ^ (seed >>> 15), 1 | seed); t2 = (t2 + Math.imul(t2 ^ (t2 >>> 7), 61 | t2)) ^ t2; return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296; }; }
    const cache = {};
    function textura(madeira, tipo, larg, alt) {
        const chave = madeira + tipo + larg + alt;
        if (cache[chave]) return cache[chave];
        const [claro, base, esc_, contorno] = MADEIRA[madeira];
        const c = document.createElement("canvas"); c.width = larg; c.height = alt;
        const g = c.getContext("2d"), r = rng(larg * 31 + alt + madeira.length * 7);
        const px = (x, y, cor) => { g.fillStyle = cor; g.fillRect(x, y, 1, 1); };
        for (let y = 0; y < alt; y++) for (let x = 0; x < larg; x++) {
            let cor = base;
            if (tipo === "hanging_sign") {           // tronco descascado: veio vertical
                const v = (x * 7 + Math.floor(y / 3)) % 5;
                cor = v === 0 ? esc_ : v === 3 ? claro : base;
            } else {                                  // tábuas: veio horizontal + emendas
                const faixa = Math.floor((y - 1) / 2.75);
                const v = (y + faixa) % 3;
                cor = v === 0 ? claro : v === 2 ? esc_ : base;
                const emenda = [5, 13, 9, 17][faixa % 4];
                if (x === emenda && y > 0 && y < alt - 1) cor = esc_;
            }
            if (r() < 0.07) cor = esc_;
            if (r() < 0.04) cor = claro;
            px(x, y, cor);
        }
        g.fillStyle = contorno;                       // contorno de 1 pixel
        g.fillRect(0, 0, larg, 1); g.fillRect(0, alt - 1, larg, 1); g.fillRect(0, 0, 1, alt); g.fillRect(larg - 1, 0, 1, alt);
        return (cache[chave] = c.toDataURL());
    }
    function texturaPoste(madeira) {
        const chave = "poste" + madeira;
        if (cache[chave]) return cache[chave];
        const [claro, base, esc_, contorno, poste] = MADEIRA[madeira];
        const c = document.createElement("canvas"); c.width = 2; c.height = 14;
        const g = c.getContext("2d");
        for (let y = 0; y < 14; y++) { g.fillStyle = y % 3 === 0 ? esc_ : poste; g.fillRect(0, y, 1, 1); g.fillStyle = y % 4 === 1 ? base : esc_; g.fillRect(1, y, 1, 1); }
        return (cache[chave] = c.toDataURL());
    }

    // ---------------- editores das 4 linhas ----------------
    const editores = [];
    document.querySelectorAll("[data-linha]").forEach((el) => {
        const i = +el.dataset.linha;
        editores[i] = NK.editor(el, { valor: e.linhas[i] || "", hex: true, compacto: true, aoMudar: (v) => { e.linhas[i] = v; atualizar(); } });
    });

    // ---------------- comandos ----------------
    const vazio = (s) => !NK.analisar(s || "").length;
    function componentes(v) {
        return e.linhas.map((L) => {
            if (vazio(L)) return v === "a" ? '""' : "'\"\"'";
            return v === "a" ? NK.compRico(L, "snbt") : NK.nbtAspasSimples(NK.compRico(L, "json"));
        });
    }
    function lado(v) {
        return "{messages:[" + componentes(v).join(",") + '],color:"' + e.corante + '"' + (e.brilho ? ",has_glowing_text:" + (v === "a" ? "true" : "1b") : "") + "}";
    }
    function nbt(v) {
        if (v === "d") {
            return componentes("d").map((m, i) => "Text" + (i + 1) + ":" + m).join(",") + ',Color:"' + e.corante + '"' + (e.brilho ? ",GlowingText:1b" : "");
        }
        const partes = ["front_text:" + lado(v)];
        if (e.atras) partes.push("back_text:" + lado(v));
        if (e.cera) partes.push("is_waxed:" + (v === "a" ? "true" : "1b"));
        return partes.join(",");
    }

    let ultimaAparencia = "";
    function atualizar() {
        const v = NK.versao;
        e.madeira = $("madeira").value; e.tipo = $("tipo").value; e.corante = $("corante").value; e.rot = +$("rot").value;
        e.brilho = $("brilho").checked; e.cera = $("cera").checked; e.atras = $("atras").checked;

        const avisos = [];
        let tipo = e.tipo;
        if (v === "d" && tipo === "hanging_sign") { avisos.push(t("sign.no_hanging")); tipo = "sign"; }
        if (v === "d" && (e.cera || e.atras)) avisos.push(t("sign.no_wax"));
        const limite = tipo === "hanging_sign" ? 60 : 90;
        e.linhas.forEach((L, i) => { const w = NK.largura(L || ""); if (w > limite) avisos.push(t("sign.too_wide", { n: i + 1, w }).replace("/90", "/" + limite)); });
        $("avisos").innerHTML = avisos.map(esc).join("<br>");

        const id = "minecraft:" + e.madeira + "_" + tipo;
        NK.mostrarComando($("outSet"), "/setblock ~ ~ ~ " + id + "[rotation=" + e.rot + "]{" + nbt(v) + "}");
        const give = (v === "a" || v === "b")
            ? "/give @p " + id + '[block_entity_data={id:"minecraft:' + (tipo === "sign" ? "sign" : "hanging_sign") + '",' + nbt(v) + "}]"
            : "/give @p " + id + "{BlockEntityTag:{" + nbt(v) + "}}";
        NK.mostrarComando($("outGive"), give);

        // ---- prévia ----
        const suspensa = tipo === "hanging_sign";
        const placa = $("placa");
        placa.classList.toggle("suspensa", suspensa);
        $("cena").classList.toggle("suspensa", suspensa);
        placa.style.backgroundImage = "url(" + textura(e.madeira, tipo, suspensa ? 16 : 24, suspensa ? 10 : 12) + ")";
        $("poste").hidden = suspensa;
        $("correntes").hidden = !suspensa;
        $("poste").style.backgroundImage = "url(" + texturaPoste(e.madeira) + ")";
        const base = CORANTE[e.corante];
        const corBase = e.brilho ? hex(base) : escuro(base);
        placa.classList.toggle("brilho", e.brilho);
        placa.style.setProperty("--contorno-txt", e.brilho ? (e.corante === "black" ? "#F0EBCC" : escuro(base)) : "transparent");
        // o campo de cada linha fica com a cor da madeira e o texto sem cor com a cor do corante, como na placa
        const ap = { fundo: MADEIRA[e.madeira][1], corPadrao: corBase };
        if (ap.fundo + ap.corPadrao !== ultimaAparencia) { ultimaAparencia = ap.fundo + ap.corPadrao; editores.forEach((ed) => ed && ed.aparencia(ap)); }
        $("txt").innerHTML = e.linhas.map((L) => '<div class="sg-l">' + (vazio(L) ? "&nbsp;" : NK.renderCodigos(L, "§", corBase)) + "</div>").join("");
    }

    ["madeira", "tipo", "corante", "rot"].forEach((id) => { $(id).value = e[id]; $(id).addEventListener("change", atualizar); });
    ["brilho", "cera", "atras"].forEach((id) => { $(id).checked = e[id]; $(id).addEventListener("change", atualizar); });
    NK.onVersao(atualizar);
    atualizar();
})();
