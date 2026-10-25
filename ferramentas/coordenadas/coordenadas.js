/* NEKYOH — Coordenadas Overworld ↔ Nether */
(function () {
    "use strict";
    const { t, esc } = NK;
    const $ = (id) => document.getElementById(id);
    let c = Object.assign({ ow: { x: 0, y: 64, z: 0 } }, NK.ler("coordenadas", {}));
    let portais = NK.ler("portais", []);

    const fmt = (n) => (Math.round(n * 100) / 100).toString();
    const ne = () => ({ x: c.ow.x / 8, y: c.ow.y, z: c.ow.z / 8 });

    // centro do bloco (x.5) para não cair na borda
    const alvo = (p) => (Math.floor(p.x) + 0.5) + " " + Math.floor(p.y) + " " + (Math.floor(p.z) + 0.5);
    const cmd = (dim, p) => "/execute in minecraft:" + (dim === "ow" ? "overworld" : "the_nether") + " run tp @s " + alvo(p);
    const tp = (p) => "/tp @s " + alvo(p);

    function preencher(foco) {
        const n = ne();
        ["x", "y", "z"].forEach((k) => {
            if (foco !== "ow") $("ow" + k).value = fmt(c.ow[k]);
            if (foco !== "ne") $("ne" + k).value = k === "y" ? fmt(n.y) : Math.floor(n[k]);
        });
        $("neExato").textContent = (n.x % 1 || n.z % 1) ? t("coord.exact", { v: fmt(n.x) + ", " + fmt(n.y) + ", " + fmt(n.z) }) : "";
        $("owExato").textContent = "";
        const pNe = { x: Math.floor(n.x), y: n.y, z: Math.floor(n.z) };
        NK.mostrarComando($("owCmd"), cmd("ow", c.ow));
        NK.mostrarComando($("neCmd"), cmd("ne", pNe));
        NK.mostrarComando($("owTp"), tp(c.ow));
        NK.mostrarComando($("neTp"), tp(pNe));
        const d = Math.hypot(c.ow.x, c.ow.z);
        $("dist").textContent = t("coord.dist_v", { ow: NK.num(Math.round(d)), ne: NK.num(Math.round(d / 8)) });
        NK.guardar("coordenadas", c);
    }

    document.querySelectorAll("input[data-dim]").forEach((inp) => {
        inp.addEventListener("input", () => {
            const v = parseFloat(inp.value);
            if (isNaN(v)) return;
            const k = inp.dataset.eixo;
            if (inp.dataset.dim === "ow") c.ow[k] = v;
            else c.ow[k] = k === "y" ? v : v * 8;
            preencher(inp.dataset.dim);
        });
    });

    // colar: em cada dimensão (campo próprio ou direto em X/Y/Z). Aceita "X Y Z", "/tp …" e F3+C.
    function lerNumeros(txt) {
        const sem = txt.replace(/minecraft:[a-z_]+/g, " ").replace(/@[a-z](\[[^\]]*\])?/g, " ");
        return (sem.match(/-?\d+(?:[.,]\d+)?/g) || []).map((x) => parseFloat(x.replace(",", ".")));
    }
    function colar(dim, txt) {
        const nota = $(dim + "Nota");
        const nums = lerNumeros(txt);
        if (nums.length < 3) { nota.textContent = txt.trim() ? t("coord.paste_bad") : ""; nota.classList.add("alerta"); return false; }
        let [x, y, z] = nums;
        // o texto do F3+C diz a dimensão; se não disser, vale a do campo onde colou
        const destino = /the_nether/.test(txt) ? "ne" : /overworld/.test(txt) ? "ow" : dim;
        c.ow = destino === "ne" ? { x: x * 8, y, z: z * 8 } : { x, y, z };
        nota.textContent = t("coord.pasted"); nota.classList.remove("alerta");
        setTimeout(() => { nota.textContent = ""; }, 1800);
        preencher();
        return true;
    }
    document.querySelectorAll("[data-colar]").forEach((inp) => {
        inp.addEventListener("input", () => { if (colar(inp.dataset.colar, inp.value)) inp.value = ""; });
    });
    document.querySelectorAll("input[data-dim]").forEach((inp) => {
        inp.addEventListener("paste", (ev) => {
            const txt = (ev.clipboardData || window.clipboardData).getData("text");
            if (lerNumeros(txt).length >= 3) { ev.preventDefault(); colar(inp.dataset.dim, txt); }
        });
    });

    // portais guardados
    function renderLista() {
        $("lista").innerHTML = portais.length ? portais.map((p, i) =>
            '<li><div class="coord-item"><b>' + esc(p.nome) + "</b><span>" + esc(t("coord.ow")) + ": " + fmt(p.x) + " " + fmt(p.y) + " " + fmt(p.z) +
            " · " + esc(t("coord.ne")) + ": " + Math.floor(p.x / 8) + " " + fmt(p.y) + " " + Math.floor(p.z / 8) + "</span></div>" +
            '<button type="button" class="mc-btn mc-btn-sm" data-usar="' + i + '">' + esc(t("coord.use")) + "</button>" +
            '<button type="button" class="mc-btn mc-btn-sm pal-apagar" data-apagar="' + i + '">✕</button></li>').join("")
            : '<li class="vazio">' + esc(t("coord.none")) + "</li>";
    }
    $("guardar").addEventListener("click", () => {
        const nome = $("nomePortal").value.trim() || ("#" + (portais.length + 1));
        portais.unshift({ nome, x: c.ow.x, y: c.ow.y, z: c.ow.z });
        NK.guardar("portais", portais); $("nomePortal").value = ""; renderLista();
    });
    $("lista").addEventListener("click", (e) => {
        const u = e.target.closest("[data-usar]"), a = e.target.closest("[data-apagar]");
        if (u) { const p = portais[+u.dataset.usar]; c.ow = { x: p.x, y: p.y, z: p.z }; preencher(); window.scrollTo({ top: 0, behavior: "smooth" }); }
        if (a) { portais.splice(+a.dataset.apagar, 1); NK.guardar("portais", portais); renderLista(); }
    });

    preencher();
    renderLista();
})();
