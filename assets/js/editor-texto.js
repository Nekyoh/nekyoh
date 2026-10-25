/*
 * NEKYOH — editor de texto com cor por palavra
 * Escreve-se normalmente; seleciona-se um trecho (ou clica-se numa palavra) e escolhe-se a cor/estilo.
 * O valor é uma string com códigos (§6, §l, §#rrggbb…) — ver NK.analisar / NK.serializar.
 *
 *   const ed = NK.editor(elemento, { valor, multilinha, hex, corPadrao, placeholder, aoMudar(str) })
 *   ed.valor()  ·  ed.definir(str)
 */
(function () {
    "use strict";
    const { t, esc } = NK;

    // contraste (WCAG) entre a cor do texto e o fundo do campo: abaixo de ~2,2 a palavra some
    function luz(hex) {
        const n = parseInt(String(hex).slice(1), 16);
        const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }
    function contraste(a, b) { const x = luz(a), y = luz(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

    function editor(raiz, op) {
        op = Object.assign({ valor: "", multilinha: false, hex: true, corPadrao: "#FFFFFF", placeholder: "", aoMudar: () => {}, fundo: "#000000", compacto: false }, op);
        let chars = NK.analisar(op.valor || "");
        let selec = { ini: chars.length, fim: chars.length };
        let pendente = null;          // estilo para o próximo texto digitado (campo vazio)
        let compondo = false;

        raiz.classList.add("ed");
        if (op.compacto) raiz.classList.add("compacto");
        raiz.innerHTML =
            '<div class="ed-barra"><div class="ed-cores"></div><div class="ed-est"></div>' +
            '<button type="button" class="estilo ed-limpar" title="' + esc(t("ui.clear_fmt")) + '">⌀</button></div>' +
            '<div class="ed-campo mc-input' + (op.multilinha ? " multi" : "") + "" + '" contenteditable="true" spellcheck="false" role="textbox"' +
            (op.multilinha ? ' aria-multiline="true"' : "") + ' data-ph="' + esc(op.placeholder) + '"></div>';
        const campo = raiz.querySelector(".ed-campo");
        const pintarFundo = () => { campo.style.background = op.fundo; campo.style.setProperty("--ed-fundo", op.fundo); };
        pintarFundo();
        const cores = NK.seletorCor(raiz.querySelector(".ed-cores"), "", (c) => aplicar((st) => { if (c) st.color = c; else delete st.color; }), { nenhuma: true, hex: op.hex });
        const estObj = {};
        NK.seletorEstilo(raiz.querySelector(".ed-est"), estObj, () => {});
        raiz.querySelector(".ed-est").addEventListener("click", (e) => {
            const b = e.target.closest("[data-est]");
            if (!b) return;
            const k = b.dataset.est;
            const faixa = alcance();
            const todos = faixa.ini < faixa.fim && chars.slice(faixa.ini, faixa.fim).every((c) => c.ch === "\n" || c.st[k]);
            aplicar((st) => { if (todos) delete st[k]; else st[k] = true; });
        });
        raiz.querySelector(".ed-limpar").addEventListener("click", () => aplicar((st) => { Object.keys(st).forEach((k) => delete st[k]); }));

        // ---------- desenhar ----------
        function desenhar() {
            let h = "", buf = "", ant = null;
            const fecha = () => {
                if (buf === "") return;
                const st = ant || {};
                const hex = NK.hexDe(st.color) || op.corPadrao;
                const cls = ["ed-t"];
                if (contraste(hex, op.fundo) < 2.2) cls.push(luz(op.fundo) > 0.35 ? "ed-pouco-escuro" : "ed-pouco-claro");
                if (st.bold) cls.push("mc-l"); if (st.italic) cls.push("mc-o"); if (st.underlined) cls.push("mc-n");
                if (st.strikethrough) cls.push("mc-m"); if (st.obfuscated) cls.push("ed-k");
                h += '<span class="' + cls.join(" ") + '" style="color:' + hex + '" data-s="' + esc(JSON.stringify(st)) + '">' + esc(buf) + "</span>";
                buf = "";
            };
            chars.forEach((c) => {
                if (c.ch === "\n") { fecha(); h += "<br>"; ant = null; return; }
                if (ant && JSON.stringify(ant) === JSON.stringify(c.st)) buf += c.ch;
                else { fecha(); ant = c.st; buf = c.ch; }
            });
            fecha();
            if (op.multilinha && chars.length && chars[chars.length - 1].ch === "\n") h += "<br>";
            campo.innerHTML = h;
        }

        // ---------- ler o que está no campo ----------
        function ler() {
            const out = [];
            const andar = (no, stHerdado) => {
                no.childNodes.forEach((n) => {
                    if (n.nodeType === 3) {
                        const st = stHerdado || estiloParaNovo(out.length);
                        for (const ch of n.nodeValue.replace(/​/g, "")) out.push({ ch: ch === " " ? " " : ch, st: Object.assign({}, st) });
                    } else if (n.nodeName === "BR") {
                        if (op.multilinha && n !== campo.lastChild) out.push({ ch: "\n", st: {} });
                    } else if (n.nodeType === 1) {
                        if ((n.nodeName === "DIV" || n.nodeName === "P") && out.length && op.multilinha) out.push({ ch: "\n", st: {} });
                        let st = stHerdado;
                        if (n.dataset && n.dataset.s) { try { st = JSON.parse(n.dataset.s); } catch (e) {} }
                        andar(n, st);
                    }
                });
            };
            andar(campo, null);
            return out;
        }
        function estiloParaNovo(pos) {
            if (pendente) return pendente;
            const ant = chars[Math.min(pos, chars.length) - 1];
            return ant && ant.ch !== "\n" ? ant.st : {};
        }

        // ---------- posição do cursor em nº de caracteres ----------
        function offsetDe(no, off) {
            let n = 0, achou = false;
            const andar = (el) => {
                for (const c of el.childNodes) {
                    if (achou) return;
                    if (c === no) { n += c.nodeType === 3 ? off : contar(c, off); achou = true; return; }
                    if (c.nodeType === 3) n += c.nodeValue.length;
                    else if (c.nodeName === "BR") n += 1;
                    else andar(c);
                }
            };
            const contar = (el, k) => { let m = 0; for (let i = 0; i < k; i++) m += tamanho(el.childNodes[i]); return m; };
            const tamanho = (c) => c.nodeType === 3 ? c.nodeValue.length : c.nodeName === "BR" ? 1 : [...c.childNodes].reduce((a, x) => a + tamanho(x), 0);
            if (no === campo) return contar(campo, off);
            andar(campo);
            return n;
        }
        function lerSelecao() {
            const s = window.getSelection();
            if (!s.rangeCount || !campo.contains(s.anchorNode)) return null;
            const r = s.getRangeAt(0);
            const a = offsetDe(r.startContainer, r.startOffset), b = offsetDe(r.endContainer, r.endOffset);
            return { ini: Math.min(a, b), fim: Math.max(a, b) };
        }
        function porSelecao(ini, fim) {
            const s = window.getSelection();
            const achar = (alvo) => {
                let n = 0;
                const andar = (el) => {
                    for (const c of el.childNodes) {
                        if (c.nodeType === 3) { if (alvo <= n + c.nodeValue.length) return [c, alvo - n]; n += c.nodeValue.length; }
                        else if (c.nodeName === "BR") { if (alvo <= n) return [el, [...el.childNodes].indexOf(c)]; n += 1; }
                        else { const r = andar(c); if (r) return r; }
                    }
                    return null;
                };
                return andar(campo) || [campo, campo.childNodes.length];
            };
            const [n1, o1] = achar(ini), [n2, o2] = achar(fim);
            const r = document.createRange();
            try { r.setStart(n1, o1); r.setEnd(n2, o2); s.removeAllRanges(); s.addRange(r); } catch (e) {}
        }

        // ---------- aplicar cor/estilo ----------
        function alcance() {
            let { ini, fim } = selec;
            if (ini === fim) {
                // sem seleção: a palavra onde está o cursor; se não houver, o texto todo
                const ehPalavra = (i) => chars[i] && !/\s/.test(chars[i].ch);
                let a = ini, b = ini;
                while (ehPalavra(a - 1)) a--;
                while (ehPalavra(b)) b++;
                if (a < b) return { ini: a, fim: b, palavra: true };
                return { ini: 0, fim: chars.length, tudo: true };
            }
            return { ini, fim };
        }
        function aplicar(mudar) {
            const f = alcance();
            if (!chars.length) {                // campo vazio: vale para o que for digitado
                pendente = Object.assign({}, pendente || {});
                mudar(pendente);
                atualizarBarra(); campo.focus(); return;
            }
            for (let i = f.ini; i < f.fim; i++) { if (chars[i].ch === "\n") continue; const st = Object.assign({}, chars[i].st); mudar(st); chars[i] = { ch: chars[i].ch, st }; }
            desenhar();
            campo.focus();
            porSelecao(selec.ini, selec.fim);
            emitir();
        }

        // ---------- barra reflete o estilo no cursor ----------
        function atualizarBarra() {
            const st = pendente && !chars.length ? pendente : (chars[Math.max(0, selec.ini - (selec.ini === selec.fim ? 1 : 0))] || {}).st || {};
            cores.definir(st.color || "");
            raiz.querySelectorAll(".ed-est [data-est]").forEach((b) => b.setAttribute("aria-pressed", !!st[b.dataset.est]));
        }

        function emitir() { op.aoMudar(NK.serializar(chars)); }

        // ---------- eventos ----------
        campo.addEventListener("compositionstart", () => { compondo = true; });
        campo.addEventListener("compositionend", () => { compondo = false; campo.dispatchEvent(new Event("input")); });
        campo.addEventListener("input", () => {
            if (compondo) return;
            const s = lerSelecao();
            chars = ler();
            if (chars.length) pendente = null;
            desenhar();
            if (s) { selec = s; porSelecao(s.ini, s.fim); }
            emitir();
        });
        campo.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (!op.multilinha) return;
                inserir("\n");
            }
        });
        campo.addEventListener("paste", (e) => {
            e.preventDefault();
            let txt = (e.clipboardData || window.clipboardData).getData("text/plain") || "";
            if (!op.multilinha) txt = txt.replace(/\r?\n/g, " ");
            inserir(txt.replace(/\r/g, ""));
        });
        function inserir(txt) {
            const s = lerSelecao() || selec;
            const st = estiloParaNovo(s.ini);
            const novos = [...txt].map((ch) => ({ ch, st: ch === "\n" ? {} : Object.assign({}, st) }));
            chars.splice(s.ini, s.fim - s.ini, ...novos);
            pendente = null;
            desenhar();
            selec = { ini: s.ini + novos.length, fim: s.ini + novos.length };
            porSelecao(selec.ini, selec.fim);
            emitir();
        }
        document.addEventListener("selectionchange", () => {
            const s = lerSelecao();
            if (s) { selec = s; atualizarBarra(); }
        });

        desenhar();
        atualizarBarra();
        return {
            valor: () => NK.serializar(chars),
            definir: (str) => { chars = NK.analisar(str || ""); desenhar(); emitir(); },
            /** muda o fundo do campo e a cor do texto sem cor (ex.: madeira e corante da placa) */
            aparencia: (a) => {
                if (a.fundo) op.fundo = a.fundo;
                if (a.corPadrao) op.corPadrao = a.corPadrao;
                pintarFundo();
                const s = lerSelecao(); desenhar(); if (s) porSelecao(s.ini, s.fim);
            },
            campo,
        };
    }

    NK.editor = editor;
})();

/*
 * Busca de itens/blocos com ícone.
 *   NK.buscaItem(input, { ids: [...opcional], aoEscolher(id) })
 * Mostra ícone + nome oficial + id; setas ↑↓, Enter e Esc.
 */
(function () {
    "use strict";
    const { esc, icone, ITENS } = NK;
    const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    function buscaItem(input, op) {
        const ids = op.ids || Object.keys(ITENS);
        const base = ids.map((id) => ({ id, nome: ITENS[id] || id, n: norm(ITENS[id] || id), ni: norm(id) }));
        const caixa = document.createElement("div");
        caixa.className = "busca-lista"; caixa.hidden = true; caixa.setAttribute("role", "listbox");
        input.parentNode.classList.add("busca");
        input.parentNode.appendChild(caixa);
        input.setAttribute("autocomplete", "off");
        input.setAttribute("role", "combobox");
        let res = [], ativo = 0;

        function buscar() {
            const q = norm(input.value.trim().replace(/^minecraft:/, ""));
            if (!q) { res = base.slice(0, 40); }
            else {
                const comeca = [], contem = [];
                for (const it of base) {
                    if (it.n.startsWith(q) || it.ni.startsWith(q)) comeca.push(it);
                    else if (it.n.includes(q) || it.ni.includes(q.replace(/ /g, "_"))) contem.push(it);
                }
                const peso = (it) => (it.n === q || it.ni === q ? 0 : 1) * 1000 + it.n.length;
                comeca.sort((x, y) => peso(x) - peso(y));
                res = comeca.concat(contem).slice(0, 40);
            }
            ativo = 0;
            caixa.innerHTML = res.length ? res.map((it, i) =>
                '<div class="busca-op' + (i === 0 ? " ativo" : "") + '" role="option" data-i="' + i + '"><span class="slot-p">' + icone(it.id, it.nome, 24) + "</span>" +
                "<span><b>" + esc(it.nome) + "</b><small>" + esc(it.id) + "</small></span></div>").join("")
                : '<div class="busca-vazio">—</div>';
            caixa.hidden = false;
        }
        function escolher(i) {
            const it = res[i];
            if (!it) return;
            caixa.hidden = true;
            op.aoEscolher(it.id);
        }
        function mover(d) {
            const ops = caixa.querySelectorAll(".busca-op");
            if (!ops.length) return;
            ops[ativo].classList.remove("ativo");
            ativo = (ativo + d + ops.length) % ops.length;
            ops[ativo].classList.add("ativo");
            ops[ativo].scrollIntoView({ block: "nearest" });
        }
        input.addEventListener("input", buscar);
        input.addEventListener("focus", () => { input.select(); buscar(); });
        input.addEventListener("keydown", (e) => {
            if (caixa.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) { buscar(); return; }
            if (e.key === "ArrowDown") { e.preventDefault(); mover(1); }
            else if (e.key === "ArrowUp") { e.preventDefault(); mover(-1); }
            else if (e.key === "Enter") { e.preventDefault(); escolher(ativo); }
            else if (e.key === "Escape") { caixa.hidden = true; }
        });
        caixa.addEventListener("mousedown", (e) => { e.preventDefault(); const o = e.target.closest(".busca-op"); if (o) escolher(+o.dataset.i); });
        input.addEventListener("blur", () => setTimeout(() => { caixa.hidden = true; if (op.aoSair) op.aoSair(); }, 120));
    }
    NK.buscaItem = buscaItem;
})();
