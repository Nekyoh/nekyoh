/* NEKYOH — texturas em pixel geradas no navegador + pequenos comportamentos */
(function () {
    "use strict";

    // Gerador pseudo-aleatório com semente (as texturas ficam sempre iguais)
    function rng(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function textura(seed, desenhar, w, h) {
        w = w || 16; h = h || 16;
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        const r = rng(seed);
        const px = (x, y, cor) => { ctx.fillStyle = cor; ctx.fillRect(x, y, 1, 1); };
        const pick = (arr) => arr[Math.floor(r() * arr.length)];
        desenhar({ ctx, r, px, pick, w, h });
        return "url(" + c.toDataURL() + ")";
    }

    const TERRA = ["#866043", "#79553a", "#6b4a30", "#9a7350", "#8a6446"];
    const GRAMA = ["#5d9b3a", "#4f8a2f", "#6aab43", "#578f35"];
    const PEDRA = ["#7f7f7f", "#888888", "#747474", "#6e6e6e", "#8f8f8f"];
    const DEEP  = ["#4d4d52", "#45454a", "#57575c", "#3e3e43"];

    const tex = {
        grama: textura(11, ({ px, pick, r }) => {
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, pick(TERRA));
            for (let x = 0; x < 16; x++) {
                const fundo = 3 + Math.floor(r() * 3);
                for (let y = 0; y < fundo; y++) px(x, y, pick(GRAMA));
            }
        }),
        terra: textura(23, ({ px, pick }) => {
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, pick(TERRA));
        }),
        pedra: textura(37, ({ px, pick, r }) => {
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, pick(PEDRA));
            for (let i = 0; i < 6; i++) {
                const x = Math.floor(r() * 14), y = Math.floor(r() * 15);
                px(x, y, "#5f5f5f"); px(x + 1, y, "#666666");
            }
        }),
        deepslate: textura(41, ({ px, pick, r }) => {
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, pick(DEEP));
            for (let i = 0; i < 5; i++) {
                const y = Math.floor(r() * 16), x0 = Math.floor(r() * 10);
                for (let x = x0; x < x0 + 5; x++) px(x, y, "#36363b");
            }
        }),
        tabuas: textura(53, ({ px, r }) => {
            const tons = ["#a2834f", "#9c7e4b", "#ad8a54", "#967444"];
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, tons[Math.floor(r() * tons.length)]);
            for (let x = 0; x < 16; x++) { px(x, 3, "#6b5232"); px(x, 7, "#6b5232"); px(x, 11, "#6b5232"); px(x, 15, "#6b5232"); }
            [[5, 0], [12, 4], [2, 8], [9, 12]].forEach(([x, y0]) => { for (let y = y0; y < y0 + 3; y++) px(x, y, "#7c5f38"); });
        }),
        estrelas: textura(67, ({ px, r }) => {
            for (let i = 0; i < 70; i++) {
                const x = Math.floor(r() * 254), y = Math.floor(r() * 254);
                const cor = r() > 0.85 ? "#ffffff" : (r() > 0.5 ? "#c9c3e6" : "#8f88b5");
                px(x, y, cor); if (r() > 0.8) px(x + 1, y, cor);
            }
        }, 256, 256),
    };

    const raiz = document.documentElement.style;
    Object.keys(tex).forEach((k) => raiz.setProperty("--tex-" + k, tex[k]));
    document.documentElement.classList.add("tex-ok");

    // Fecha o seletor de idioma ao clicar fora
    const idioma = document.querySelector("details.idioma");
    if (idioma) {
        document.addEventListener("click", (e) => { if (!idioma.contains(e.target)) idioma.open = false; });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") idioma.open = false; });
    }

    // Moldura de item: cada clique roda a logo 45°, como no jogo
    const moldura = document.querySelector(".moldura");
    if (moldura) {
        let giro = 0;
        moldura.addEventListener("click", () => {
            giro += 45;
            moldura.style.setProperty("--giro", giro + "deg");
        });
    }

    // Abas de categoria das ferramentas (home)
    const abasCat = document.querySelector(".abas-criativo");
    if (abasCat) {
        const cartoes = document.querySelectorAll("#grelhaFerramentas .cartao");
        const filtrar = (f) => {
            abasCat.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.filtro === f));
            cartoes.forEach((c) => { c.hidden = !(f === "todas" || (c.dataset.cat || "").split(" ").includes(f)); });
            try { sessionStorage.setItem("nk_cat", f); } catch (e) {}
        };
        abasCat.addEventListener("click", (e) => { const b = e.target.closest("[data-filtro]"); if (b) filtrar(b.dataset.filtro); });
        try { const f = sessionStorage.getItem("nk_cat"); if (f && abasCat.querySelector('[data-filtro="' + f + '"]')) filtrar(f); } catch (e) {}
    }

    // Guarda o idioma também no localStorage (para outras ferramentas do site lerem)
    // (só quando a pessoa escolheu; sem escolha, cada visita segue o idioma do navegador)
    try { if (window.NK_LANG && window.NK_LANG_ESCOLHIDO) localStorage.setItem("nekyoh_lang", window.NK_LANG); } catch (e) {}
})();
