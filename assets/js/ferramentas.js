/*
 * NEKYOH — base partilhada das ferramentas
 * Textos (NK.t), cores do Minecraft, texto formatado (§/&), componentes JSON/SNBT,
 * botões copiar, versão do jogo partilhada, seletores de cor/estilo e ícones de itens.
 */
(function () {
    "use strict";

    const T = window.NK_I18N || {};
    const lang = window.NK_LANG || (document.documentElement.lang || "en").slice(0, 2);
    const locale = { pt: "pt-BR", es: "es-ES" }[lang] || "en-US";

    function t(k, vars) {
        let s = T[k] !== undefined ? T[k] : k;
        if (vars && typeof s === "string") Object.keys(vars).forEach((v) => { s = s.split("{" + v + "}").join(vars[v]); });
        return s;
    }

    const nf = new Intl.NumberFormat(locale);
    const nf2 = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    // ---------------- cores e formatos do Minecraft ----------------
    const CORES = [
        ["0", "black", "#000000"], ["1", "dark_blue", "#0000AA"], ["2", "dark_green", "#00AA00"], ["3", "dark_aqua", "#00AAAA"],
        ["4", "dark_red", "#AA0000"], ["5", "dark_purple", "#AA00AA"], ["6", "gold", "#FFAA00"], ["7", "gray", "#AAAAAA"],
        ["8", "dark_gray", "#555555"], ["9", "blue", "#5555FF"], ["a", "green", "#55FF55"], ["b", "aqua", "#55FFFF"],
        ["c", "red", "#FF5555"], ["d", "light_purple", "#FF55FF"], ["e", "yellow", "#FFFF55"], ["f", "white", "#FFFFFF"],
    ].map(([codigo, nome, hex]) => ({ codigo, nome, hex }));
    const porNome = {}, porCodigo = {};
    CORES.forEach((c) => { porNome[c.nome] = c; porCodigo[c.codigo] = c; });
    const FORMATOS = { l: "bold", o: "italic", n: "underlined", m: "strikethrough", k: "obfuscated" };

    function hexDe(cor) {
        if (!cor) return null;
        if (cor[0] === "#") return cor;
        return porNome[cor] ? porNome[cor].hex : null;
    }
    /** Sombra do texto no jogo: a cor dividida por 4 */
    function sombra(hex) {
        const n = parseInt(hex.slice(1), 16);
        const r = ((n >> 16) & 255) >> 2, g = ((n >> 8) & 255) >> 2, b = (n & 255) >> 2;
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function spanEstilo(texto, est, corPadrao) {
        if (texto === "") return "";
        const hex = hexDe(est.color) || corPadrao || "#FFFFFF";
        const cls = ["mc-t"];
        if (est.bold) cls.push("mc-l");
        if (est.italic) cls.push("mc-o");
        if (est.underlined) cls.push("mc-n");
        if (est.strikethrough) cls.push("mc-m");
        if (est.obfuscated) cls.push("mc-k");
        return '<span class="' + cls.join(" ") + '" style="color:' + hex + ";--sombra:" + sombra(hex) + '">' + esc(texto) + "</span>";
    }

    /** Texto com códigos §/& → HTML com as cores do jogo */
    // ---------------- texto rico guardado como string com códigos ----------------
    // §0-§f cores, §l §o §n §m §k estilos, §r limpa, e §#rrggbb para cor hex (interno do site).
    // Como no jogo: um código de cor apaga os estilos anteriores.
    const CHAVES = ["bold", "italic", "underlined", "strikethrough", "obfuscated"];

    /** "§6Olá §lmundo" → [{ch:"O", st:{color:"gold"}}, ...] */
    function analisar(str, marca) {
        marca = marca || "§";
        const out = [];
        let st = {};
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (ch === marca && i + 1 < str.length) {
                const c = str[i + 1].toLowerCase();
                if (c === "#" && /^[0-9a-f]{6}$/i.test(str.substr(i + 2, 6))) { st = { color: "#" + str.substr(i + 2, 6).toLowerCase() }; i += 7; continue; }
                if (porCodigo[c]) { st = { color: porCodigo[c].nome }; i++; continue; }
                if (FORMATOS[c]) { st = Object.assign({}, st, { [FORMATOS[c]]: true }); i++; continue; }
                if (c === "r") { st = {}; i++; continue; }
            }
            out.push({ ch, st });
        }
        return out;
    }
    const chaveEst = (st) => (st.color || "") + "|" + CHAVES.filter((k) => st[k]).join(",");

    /** Inverso de analisar: lista de caracteres → string com códigos */
    function serializar(chars) {
        let out = "", ant = "";
        chars.forEach(({ ch, st }) => {
            const k = chaveEst(st);
            if (k !== ant) {
                if (st.color) out += st.color[0] === "#" ? "§#" + st.color.slice(1) : "§" + porNome[st.color].codigo;
                else if (ant !== "") out += "§r";
                CHAVES.forEach((c) => { if (st[c]) out += "§" + Object.keys(FORMATOS).find((f) => FORMATOS[f] === c); });
                ant = k;
            }
            out += ch;
        });
        return out;
    }

    /** Trechos com o mesmo estilo: [{text, color, bold, ...}] */
    function segmentos(str) {
        const segs = [];
        analisar(str).forEach(({ ch, st }) => {
            const ult = segs[segs.length - 1];
            if (ult && chaveEst(ult) === chaveEst(st)) ult.text += ch;
            else segs.push(Object.assign({ text: ch }, st));
        });
        return segs;
    }

    /** Divide um texto rico em linhas (cada uma com os seus próprios códigos) */
    function linhasRico(str) {
        const linhas = [[]];
        analisar(str).forEach((c) => { if (c.ch === "\n") linhas.push([]); else linhas[linhas.length - 1].push(c); });
        return linhas.map(serializar);
    }

    /** Texto §/& → HTML com as cores do jogo (inclui hex) */
    function renderCodigos(str, marca, corPadrao) {
        let out = "";
        const segs = [];
        analisar(str, marca).forEach(({ ch, st }) => {
            const ult = segs[segs.length - 1];
            if (ch !== "\n" && ult && ult.ch !== "\n" && chaveEst(ult.st) === chaveEst(st)) ult.txt += ch;
            else segs.push({ ch: ch === "\n" ? "\n" : "", txt: ch === "\n" ? "" : ch, st });
        });
        segs.forEach((g) => { out += g.ch === "\n" ? "<br>" : spanEstilo(g.txt, g.st, corPadrao); });
        return out;
    }

    /** Componente de texto: {text, color, bold, italic, underlined, strikethrough, obfuscated} */
    function compJSON(c, extra) {
        const o = { text: c.text || "" };
        if (c.color) o.color = c.color;
        CHAVES.forEach((k) => { if (c[k]) o[k] = true; });
        Object.assign(o, extra || {});
        return JSON.stringify(o);
    }
    function snbtStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }
    function compSNBT(c, extra) {
        const partes = ["text:" + snbtStr(c.text || "")];
        if (c.color) partes.push("color:" + snbtStr(c.color));
        CHAVES.forEach((k) => { if (c[k]) partes.push(k + ":true"); });
        Object.entries(extra || {}).forEach(([k, v]) => partes.push(k + ":" + (typeof v === "string" ? snbtStr(v) : v)));
        return "{" + partes.join(",") + "}";
    }
    /** String entre aspas simples para NBT antigo: '{"text":"..."}' */
    function nbtAspasSimples(s) { return "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'"; }

    /**
     * Texto rico → componente. formato "json" ou "snbt".
     * 1 trecho = objeto; vários = lista ["", trecho, trecho…] (o 1º elemento leva o "extra", ex. italic:false).
     * Texto vazio → '""'.
     */
    function compRico(str, formato, extra) {
        const segs = segmentos(str);
        const um = formato === "snbt" ? compSNBT : compJSON;
        if (!segs.length) return extra && Object.keys(extra).length ? um({ text: "" }, extra) : '""';
        if (segs.length === 1) return um(segs[0], extra);
        const pai = um({ text: "" }, extra);
        return "[" + pai + "," + segs.map((g) => um(g)).join(",") + "]";
    }

    // ---------------- guardar no navegador ----------------
    function ler(chave, padrao) {
        try { const v = localStorage.getItem("nekyoh." + chave); return v === null ? padrao : JSON.parse(v); } catch (e) { return padrao; }
    }
    function guardar(chave, valor) {
        try { localStorage.setItem("nekyoh." + chave, JSON.stringify(valor)); } catch (e) {}
    }

    // Só Paletas, Coordenadas (e o SchematicCount) guardam dados. Limpa o que versões antigas do site guardaram.
    try { ["title", "give", "armorstand", "placas", "motd", "ticks", "circulos", "encantamentos", "calc_stacks"].forEach((k) => localStorage.removeItem("nekyoh." + k)); localStorage.removeItem("nekyoh_calc_stacks"); } catch (e) {}

    // ---------------- versão do jogo (partilhada entre ferramentas) ----------------
    const ouvintesVersao = [];
    let versao = ler("versao", "a");
    function iniciarVersao() {
        document.querySelectorAll("select[data-versao]").forEach((sel) => {
            if (![...sel.options].some((o) => o.value === versao)) versao = sel.options[0].value;
            sel.value = versao;
            sel.addEventListener("change", () => {
                versao = sel.value; guardar("versao", versao);
                document.querySelectorAll("select[data-versao]").forEach((o) => { o.value = versao; });
                ouvintesVersao.forEach((fn) => fn(versao));
            });
        });
    }

    // ---------------- copiar ----------------
    async function copiarTexto(texto) {
        try { await navigator.clipboard.writeText(texto); return true; }
        catch (e) {
            const ta = document.createElement("textarea");
            ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0";
            document.body.appendChild(ta); ta.select();
            let ok = false; try { ok = document.execCommand("copy"); } catch (e2) {}
            ta.remove(); return ok;
        }
    }
    document.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-copiar]");
        if (!b) return;
        const alvo = document.querySelector(b.dataset.copiar);
        if (!alvo) return;
        const original = b.dataset.rotulo || (b.dataset.rotulo = b.textContent);
        const ok = await copiarTexto(alvo.value !== undefined && alvo.tagName !== "PRE" ? alvo.value : alvo.textContent);
        b.textContent = ok ? t("ui.copied") : "✗";
        setTimeout(() => { b.textContent = original; }, 1400);
    });

    // ---------------- ícones de itens ----------------
    function icone(id, letra, px) {
        px = px || 32;
        id = String(id || "").replace(/^minecraft:/, "");
        return '<span class="item" style="--px:' + px + 'px" data-letra="' + esc((letra || id || "?").charAt(0).toUpperCase()) + '">' +
            '<img src="https://blocksitems.com/api/v1/items/minecraft:' + encodeURIComponent(id) + '/icon?size=32" alt="" width="' + px + '" height="' + px + '" loading="lazy" ' +
            'onerror="this.parentNode.classList.add(\'sem-img\');this.remove()"></span>';
    }
    const ITENS = (window.NK_DADOS && window.NK_DADOS.itens) || {};
    function nomeItem(id) {
        id = String(id || "").replace(/^minecraft:/, "");
        return ITENS[id] || id.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
    }

    // ---------------- seletores reutilizáveis ----------------
    /** Grelha de 16 cores (+ "nenhuma" e hex opcionais). valor = nome ou "#rrggbb" ou "" */
    function seletorCor(el, valor, aoMudar, opcoes) {
        opcoes = opcoes || {};
        el.classList.add("cores");
        let html = "";
        if (opcoes.nenhuma) html += '<button type="button" class="cor cor-nenhuma" data-cor="" title="' + esc(t("ui.default")) + '"></button>';
        CORES.forEach((c) => {
            html += '<button type="button" class="cor" data-cor="' + c.nome + '" style="--c:' + c.hex + '" title="' + esc(t("ui.c." + c.nome)) + " (§" + c.codigo + ')"></button>';
        });
        if (opcoes.hex) html += '<label class="cor cor-hex" title="' + esc(t("ui.custom_hex")) + '"><input type="color" value="#22e3ea"></label>';
        el.innerHTML = html;
        const marcar = (v) => {
            el.querySelectorAll(".cor").forEach((b) => b.setAttribute("aria-pressed", b.dataset.cor === v || (b.classList.contains("cor-hex") && v && v[0] === "#")));
            const h = el.querySelector(".cor-hex");
            if (h && v && v[0] === "#") { h.style.setProperty("--c", v); h.querySelector("input").value = v; }
        };
        el.addEventListener("click", (e) => {
            const b = e.target.closest("button.cor");
            if (!b) return;
            marcar(b.dataset.cor); aoMudar(b.dataset.cor);
        });
        const hx = el.querySelector(".cor-hex input");
        if (hx) hx.addEventListener("input", () => { marcar(hx.value); aoMudar(hx.value); });
        marcar(valor || "");
        return { definir: marcar };
    }

    /** Botões B I U S K (negrito, itálico, sublinhado, riscado, embaralhado) */
    function seletorEstilo(el, obj, aoMudar) {
        const itens = [["bold", "B"], ["italic", "I"], ["underlined", "U"], ["strikethrough", "S"], ["obfuscated", "K"]];
        el.classList.add("estilos");
        el.innerHTML = itens.map(([k, l]) =>
            '<button type="button" class="estilo est-' + k + '" data-est="' + k + '" title="' + esc(t("ui." + k)) + '" aria-pressed="' + !!obj[k] + '">' + l + "</button>").join("");
        el.addEventListener("click", (e) => {
            const b = e.target.closest("[data-est]");
            if (!b) return;
            obj[b.dataset.est] = !obj[b.dataset.est];
            b.setAttribute("aria-pressed", obj[b.dataset.est]);
            aoMudar(obj);
        });
    }

    /** Abas (botões [data-aba] dentro de el, painéis [data-painel]) */
    function abas(el, aoMudar) {
        const botoes = el.querySelectorAll("[data-aba]");
        const mostrar = (id) => {
            botoes.forEach((b) => b.setAttribute("aria-selected", b.dataset.aba === id));
            document.querySelectorAll("[data-painel]").forEach((p) => { p.hidden = p.dataset.painel !== id; });
            if (aoMudar) aoMudar(id);
        };
        botoes.forEach((b) => b.addEventListener("click", () => mostrar(b.dataset.aba)));
        return mostrar;
    }

    // ---------------- texto embaralhado (§k) ----------------
    const CHARS = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789#$%&@";
    setInterval(() => {
        document.querySelectorAll(".mc-k").forEach((el) => {
            if (!el.dataset.orig) el.dataset.orig = el.textContent;
            el.textContent = el.dataset.orig.replace(/\S/g, () => CHARS[Math.floor(Math.random() * CHARS.length)]);
        });
    }, 70);

    /** Mostra comando + nº de caracteres (+ aviso > 256) */
    function mostrarComando(pre, texto) {
        pre.textContent = texto;
        const info = document.getElementById(pre.id + "Info");
        if (info) {
            const n = texto.length;
            info.textContent = t("ui.chars", { n: nf.format(n) }) + (n > 256 && texto[0] === "/" ? " — " + t("ui.long_cmd") : "");
            info.classList.toggle("alerta", n > 256 && texto[0] === "/");
        }
    }

    // ---------------- tooltip roxo do jogo para [data-tip] ----------------
    const tip = document.createElement("div");
    tip.className = "mc-tooltip"; tip.hidden = true;
    document.addEventListener("DOMContentLoaded", () => document.body.appendChild(tip));
    if (document.body) document.body.appendChild(tip);
    document.addEventListener("mouseover", (e) => {
        const el = e.target.closest("[data-tip]");
        if (!el) { tip.hidden = true; return; }
        tip.innerHTML = el.dataset.tipHtml ? el.dataset.tip : esc(el.dataset.tip);
        tip.hidden = false;
    });
    document.addEventListener("mousemove", (e) => {
        if (tip.hidden) return;
        const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
        tip.style.transform = "translate(" + x + "px," + (e.clientY - 30) + "px)";
    });

    // ---------------- largura do texto na fonte do jogo (px, com 1px de espaço) ----------------
    const LARG = { " ": 4, "!": 2, "'": 2, ",": 2, ".": 2, ":": 2, ";": 2, "|": 2, "i": 2, "`": 3, "l": 3, "\"": 4, "(": 4, ")": 4, "*": 4,
        "I": 4, "[": 4, "]": 4, "t": 4, "{": 4, "}": 4, "<": 5, ">": 5, "f": 5, "k": 5, "@": 7, "~": 7 };
    /** Largura de um texto; entende códigos § (negrito soma 1px por letra). */
    function largura(s, negrito) {
        let w = 0;
        for (let i = 0; i < s.length; i++) {
            if (s[i] === "§" && i + 1 < s.length) {
                const c = s[i + 1].toLowerCase();
                if (c === "#") { negrito = false; i += 7; continue; }
                if (c === "l") negrito = true; else if (/[0-9a-fr]/.test(c)) negrito = false;
                i++; continue;
            }
            w += (LARG[s[i]] || 6) + (negrito ? 1 : 0);
        }
        return w;
    }

    window.NK = {
        t, lang, locale, esc, num: (n) => nf.format(n), num2: (n) => nf2.format(n),
        CORES, porNome, porCodigo, hexDe, sombra, renderCodigos, spanEstilo,
        compJSON, compSNBT, snbtStr, nbtAspasSimples, compRico, analisar, serializar, segmentos, linhasRico, CHAVES,
        ler, guardar,
        get versao() { return versao; }, onVersao: (fn) => ouvintesVersao.push(fn),
        copiarTexto, icone, nomeItem, ITENS,
        seletorCor, seletorEstilo, abas, mostrarComando, largura,
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarVersao);
    else iniciarVersao();
})();
