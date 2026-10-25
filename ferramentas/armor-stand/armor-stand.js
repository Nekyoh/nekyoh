/* NEKYOH — Gerador de Armor Stands (pose, opções, equipamento e prévia) */
(function () {
    "use strict";
    const { t, esc, nomeItem, ITENS } = NK;
    const $ = (id) => document.getElementById(id);
    const PARTES = ["Head", "Body", "LeftArm", "RightArm", "LeftLeg", "RightLeg"];
    const SLOTS = ["head", "chest", "legs", "feet", "mainhand", "offhand"];
    const PRESETS = {
        padrao:  { Head: [0, 0, 0], Body: [0, 0, 0], LeftArm: [-10, 0, -10], RightArm: [-15, 0, 10], LeftLeg: [-1, 0, -1], RightLeg: [1, 0, 1] },
        acenar:  { Head: [-5, 0, 0], Body: [0, 0, 0], LeftArm: [-10, 0, -10], RightArm: [0, 0, 145], LeftLeg: [-1, 0, -1], RightLeg: [1, 0, 1] },
        andar:   { Head: [0, 0, 0], Body: [0, 0, 0], LeftArm: [30, 0, -5], RightArm: [-30, 0, 5], LeftLeg: [-30, 0, 0], RightLeg: [30, 0, 0] },
        apontar: { Head: [0, -10, 0], Body: [0, 0, 0], LeftArm: [-10, 0, -10], RightArm: [-90, -10, 0], LeftLeg: [-1, 0, -1], RightLeg: [1, 0, 1] },
        sentado: { Head: [0, 0, 0], Body: [0, 0, 0], LeftArm: [-30, 0, -10], RightArm: [-30, 0, 10], LeftLeg: [-90, -10, 0], RightLeg: [-90, 10, 0] },
        vitoria: { Head: [-15, 0, 0], Body: [0, 0, 0], LeftArm: [0, 0, -150], RightArm: [0, 0, 150], LeftLeg: [0, 0, -8], RightLeg: [0, 0, 8] },
        zumbi:   { Head: [0, 0, 0], Body: [0, 0, 0], LeftArm: [-90, 0, 0], RightArm: [-90, 0, 0], LeftLeg: [-1, 0, -1], RightLeg: [1, 0, 1] },
        zero:    { Head: [0, 0, 0], Body: [0, 0, 0], LeftArm: [0, 0, 0], RightArm: [0, 0, 0], LeftLeg: [0, 0, 0], RightLeg: [0, 0, 0] },
    };

    let e = Object.assign({
        op: { ShowArms: true, NoBasePlate: false, Small: false, Invisible: false, NoGravity: false, Invulnerable: false, Marker: false, CustomNameVisible: false, Glowing: false },
        nome: "", rot: 0, parte: "LeftArm", pose: JSON.parse(JSON.stringify(PRESETS.padrao)),
        equip: { head: "", chest: "diamond_chestplate", legs: "", feet: "", mainhand: "diamond_sword", offhand: "" },
    }, {});

    // ---------------- prévia 3D simples ----------------
    const rad = (g) => g * Math.PI / 180;
    function girar(v, [X, Y, Z]) {
        let [x, y, z] = v, a = rad(X), b = rad(-Z), c = rad(-Y);
        [y, z] = [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
        [x, z] = [x * Math.cos(c) + z * Math.sin(c), -x * Math.sin(c) + z * Math.cos(c)];
        [x, y] = [x * Math.cos(b) - y * Math.sin(b), x * Math.sin(b) + y * Math.cos(b)];
        return [x, y, z];
    }
    const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const mult = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

    function desenhar(svg, vista) {
        const k = e.op.Small ? 0.5 : 1;
        const yaw = [0, e.rot, 0];
        const P = (p) => { const w = girar(p, yaw); return vista === "frente" ? [w[0], -w[1]] : [w[2], -w[1]]; };
        const linha = (a, b, cls) => { const p = P(mult(a, k)), q = P(mult(b, k)); return '<line class="' + cls + '" x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '"/>'; };
        const base = 1;
        let h = '<line class="as-chao" x1="-24" y1="0" x2="24" y2="0"/>';
        if (!e.op.NoBasePlate) h += '<rect class="as-base" x="-6" y="-1" width="12" height="1"/>';
        const g = (n) => soma([0, base, 0], n);
        // pernas
        [["LeftLeg", 2], ["RightLeg", -2]].forEach(([p, x]) => {
            const piv = g([x, 11, 0]);
            h += linha(piv, soma(piv, girar([0, -11, 0], e.pose[p])), "as-osso" + (e.parte === p ? " sel" : ""));
        });
        // corpo
        const pesc = g([0, 23, 0]);
        const corpo = girar([0, -11, 0], e.pose.Body);
        h += linha(pesc, soma(pesc, corpo), "as-osso" + (e.parte === "Body" ? " sel" : ""));
        h += linha(soma(pesc, girar([5, 0, 0], e.pose.Body)), soma(pesc, girar([-5, 0, 0], e.pose.Body)), "as-osso" + (e.parte === "Body" ? " sel" : ""));
        h += linha(soma(pesc, soma(corpo, girar([3, 0, 0], e.pose.Body))), soma(pesc, soma(corpo, girar([-3, 0, 0], e.pose.Body))), "as-osso fino");
        // braços
        if (e.op.ShowArms) [["LeftArm", 6], ["RightArm", -6]].forEach(([p, x]) => {
            const piv = g([x, 22, 0]);
            h += linha(piv, soma(piv, girar([0, -10, 0], e.pose[p])), "as-osso" + (e.parte === p ? " sel" : ""));
        });
        // cabeça: cubo projetado + direção do rosto
        const centro = soma(pesc, girar([0, 4, 0], e.pose.Head));
        const cantos = [];
        for (const dx of [-4, 4]) for (const dy of [-4, 4]) for (const dz of [-4, 4]) cantos.push(P(mult(soma(centro, girar([dx, dy, dz], e.pose.Head)), k)));
        const xs = cantos.map((c) => c[0]), ys = cantos.map((c) => c[1]);
        const cab = (e.parte === "Head" ? " sel" : "");
        h += '<rect class="as-cabeca' + cab + '" x="' + Math.min(...xs) + '" y="' + Math.min(...ys) + '" width="' + (Math.max(...xs) - Math.min(...xs)) + '" height="' + (Math.max(...ys) - Math.min(...ys)) + '"/>';
        const c0 = P(mult(centro, k)), olhar = P(mult(soma(centro, girar([0, 0, 5], e.pose.Head)), k));
        h += '<line class="as-olhar" x1="' + c0[0] + '" y1="' + c0[1] + '" x2="' + olhar[0] + '" y2="' + olhar[1] + '"/>';
        if (e.equip.head) {
            const s = 9 * k;
            h += '<image href="https://blocksitems.com/api/v1/items/minecraft:' + encodeURIComponent(e.equip.head) + '/icon?size=32" x="' + (c0[0] - s / 2) + '" y="' + (c0[1] - s / 2) + '" width="' + s + '" height="' + s + '" style="image-rendering:pixelated"/>';
        }
        if (NK.analisar(e.nome).length) {
            const y = -(k * 34 + 3);
            h += '<text class="as-nome' + (e.op.CustomNameVisible ? "" : " fraco") + '" x="0" y="' + y + '" text-anchor="middle">' +
                NK.segmentos(e.nome).map((g) => '<tspan fill="' + (NK.hexDe(g.color) || "#FFFFFF") + '"' + (g.bold ? ' font-weight="700"' : "") + (g.italic ? ' font-style="italic"' : "") + ">" + esc(g.text) + "</tspan>").join("") + "</text>";
        }
        svg.innerHTML = '<g class="' + (e.op.Invisible ? "invisivel" : "") + (e.op.Glowing ? " brilho" : "") + '">' + h + "</g>";
    }

    // ---------------- comando ----------------
    const f = (n) => (Math.round(n * 10) / 10) + "f";
    function comando() {
        const v = NK.versao;
        const tags = [];
        Object.keys(e.op).forEach((k) => { if (e.op[k]) tags.push(k + ":1b"); });
        if (NK.analisar(e.nome).length) tags.push("CustomName:" + (v === "a" ? NK.compRico(e.nome, "snbt") : NK.nbtAspasSimples(NK.compRico(e.nome, "json"))));
        if (e.rot) tags.push("Rotation:[" + f(e.rot) + "]");
        const pose = PARTES.filter((p) => e.pose[p].some((x) => x !== 0)).map((p) => p + ":[" + e.pose[p].map(f).join(",") + "]");
        if (pose.length) tags.push("Pose:{" + pose.join(",") + "}");
        const it = (s) => e.equip[s] ? "minecraft:" + e.equip[s] : "";
        if (v === "a") {
            const eq = SLOTS.filter((s) => e.equip[s]).map((s) => s + ':{id:"' + it(s) + '"}');
            if (eq.length) tags.push("equipment:{" + eq.join(",") + "}");
        } else {
            const pilha = (s) => e.equip[s] ? '{id:"' + it(s) + '",' + (v === "b" ? "count:1" : "Count:1b") + "}" : "{}";
            if (["feet", "legs", "chest", "head"].some((s) => e.equip[s])) tags.push("ArmorItems:[" + ["feet", "legs", "chest", "head"].map(pilha).join(",") + "]");
            if (["mainhand", "offhand"].some((s) => e.equip[s])) tags.push("HandItems:[" + ["mainhand", "offhand"].map(pilha).join(",") + "]");
        }
        return "/summon minecraft:armor_stand ~ ~ ~" + (tags.length ? " {" + tags.join(",") + "}" : "");
    }

    // ---------------- controles ----------------
    function sincronizarEixos() {
        const val = e.pose[e.parte];
        ["x", "y", "z"].forEach((a, i) => {
            document.querySelector('[data-eixo="' + a + '"]').value = val[i];
            document.querySelector('[data-eixon="' + a + '"]').value = val[i];
        });
        document.querySelectorAll("[data-parte]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.parte === e.parte));
    }

    function atualizar() {
        NK.mostrarComando($("cmd"), comando());
        desenhar($("vFrente"), "frente");
        desenhar($("vLado"), "lado");
    }

    document.querySelectorAll("[data-op]").forEach((c) => {
        c.checked = !!e.op[c.dataset.op];
        c.addEventListener("change", () => { e.op[c.dataset.op] = c.checked; atualizar(); });
    });
    $("rot").value = e.rot;
    NK.editor($("nome"), { valor: e.nome || "", hex: true, aoMudar: (v) => { e.nome = v; atualizar(); } });
    $("rot").addEventListener("input", () => { e.rot = ((parseFloat($("rot").value) || 0) % 360 + 360) % 360; atualizar(); });

    $("partes").addEventListener("click", (ev) => { const b = ev.target.closest("[data-parte]"); if (b) { e.parte = b.dataset.parte; sincronizarEixos(); atualizar(); } });
    $("presets").addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-preset]");
        if (!b) return;
        e.pose = JSON.parse(JSON.stringify(PRESETS[b.dataset.preset]));
        if (b.dataset.preset !== "zero") e.op.ShowArms = true;
        document.querySelector('[data-op="ShowArms"]').checked = e.op.ShowArms;
        sincronizarEixos(); atualizar();
    });
    ["x", "y", "z"].forEach((a, i) => {
        const r = document.querySelector('[data-eixo="' + a + '"]'), n = document.querySelector('[data-eixon="' + a + '"]');
        r.addEventListener("input", () => { e.pose[e.parte][i] = +r.value; n.value = r.value; atualizar(); });
        n.addEventListener("input", () => { const v = Math.max(-180, Math.min(180, parseFloat(n.value) || 0)); e.pose[e.parte][i] = v; r.value = v; atualizar(); });
    });

    // equipamento: busca com ícone
    document.querySelectorAll("[data-slot]").forEach((inp) => {
        const sl = inp.dataset.slot;
        inp.value = e.equip[sl] ? nomeItem(e.equip[sl]) : "";
        NK.buscaItem(inp, {
            aoEscolher: (id) => { e.equip[sl] = id; inp.value = nomeItem(id); atualizar(); },
            aoSair: () => { inp.value = e.equip[sl] ? nomeItem(e.equip[sl]) : ""; },
        });
    });
    document.querySelectorAll("[data-limpar]").forEach((b) => b.addEventListener("click", () => {
        e.equip[b.dataset.limpar] = "";
        document.querySelector('[data-slot="' + b.dataset.limpar + '"]').value = "";
        atualizar();
    }));

    NK.onVersao(atualizar);
    sincronizarEixos();
    atualizar();
})();
