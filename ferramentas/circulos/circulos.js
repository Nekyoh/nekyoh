/* NEKYOH — Círculos, elipses, esferas e cúpulas
 * Um volume de blocos (calculado uma vez) alimenta duas vistas:
 *   2D: camada atual num canvas com arrastar, zoom no cursor, réguas e números
 *   3D: Three.js (carregado só quando a aba abre), só os blocos à vista, orbitar/mover/zoom
 */
(function () {
    "use strict";
    const { t } = NK;
    const $ = (id) => document.getElementById(id);

    const e = { forma: "circulo", w: 15, l: 9, h: 1, preench: "cheio", camada: 1, fantasma: true, grade: true, numeros: false, cortar: true, vista: "2d" };

    // =====================================================================
    // Geometria
    // =====================================================================
    const vol = { W: 1, H: 1, L: 1, dados: new Uint8Array(1), porCamada: [0], total: 0 };
    const idx = (x, y, z) => x + vol.W * (z + vol.L * y);
    const tem = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < vol.W && y < vol.H && z < vol.L && vol.dados[idx(x, y, z)] === 1;

    function calcular() {
        const esferico = e.forma === "esfera" || e.forma === "cupula";
        const d = e.w;
        const W = e.w, L = esferico ? d : (e.forma === "circulo" ? d : e.l);
        const H = e.forma === "esfera" ? d : e.forma === "cupula" ? Math.ceil(d / 2) : e.h;
        const desloc = e.forma === "cupula" ? d - H : 0;          // a cúpula é a metade de cima da esfera
        const dados = new Uint8Array(W * H * L);

        if (!esferico) {
            // máscara 2D da elipse (testa o centro de cada bloco) e contorno por camada
            const dentro = (x, z) => {
                if (x < 0 || z < 0 || x >= W || z >= L) return false;
                const a = (x + 0.5 - W / 2) / (W / 2), b = (z + 0.5 - L / 2) / (L / 2);
                return a * a + b * b <= 1;
            };
            const mask = new Uint8Array(W * L);
            for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
                let v = dentro(x, z);
                if (v && e.preench !== "cheio") {
                    let borda = false;
                    for (let dz = -1; dz <= 1 && !borda; dz++) for (let dx = -1; dx <= 1; dx++) {
                        if (!dx && !dz) continue;
                        if (e.preench === "fino" && dx && dz) continue;
                        if (!dentro(x + dx, z + dz)) { borda = true; break; }
                    }
                    v = borda;
                }
                mask[x + W * z] = v ? 1 : 0;
            }
            for (let y = 0; y < H; y++) dados.set(mask, W * L * y);
        } else {
            const r = d / 2;
            const dentro = (x, y, z) => {
                if (x < 0 || y < 0 || z < 0 || x >= d || y >= d || z >= d) return false;
                const a = (x + 0.5 - r) / r, b = (y + 0.5 - r) / r, c = (z + 0.5 - r) / r;
                return a * a + b * b + c * c <= 1;
            };
            for (let y = 0; y < H; y++) {
                const ys = y + desloc;
                for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
                    let v = dentro(x, ys, z);
                    if (v && e.preench !== "cheio") {
                        let borda = false;
                        for (let dy = -1; dy <= 1 && !borda; dy++) for (let dz = -1; dz <= 1 && !borda; dz++) for (let dx = -1; dx <= 1; dx++) {
                            const n = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                            if (!n || (e.preench === "fino" && n > 1)) continue;
                            if (!dentro(x + dx, ys + dy, z + dz)) { borda = true; break; }
                        }
                        v = borda;
                    }
                    if (v) dados[x + W * (z + L * y)] = 1;
                }
            }
        }
        const porCamada = new Array(H).fill(0);
        let total = 0;
        for (let y = 0; y < H; y++) {
            let n = 0;
            const ini = W * L * y, fim = ini + W * L;
            for (let i = ini; i < fim; i++) n += dados[i];
            porCamada[y] = n; total += n;
        }
        const mudouTamanho = W !== vol.W || H !== vol.H || L !== vol.L;
        Object.assign(vol, { W, H, L, dados, porCamada, total });
        mini.versao++;
        return mudouTamanho;
    }

    // =====================================================================
    // Vista 2D
    // =====================================================================
    const area = $("area"), tela = $("tela2d"), ctx = tela.getContext("2d");
    const REGUA = 22;
    const v2 = { s: 10, ox: 0, oy: 0, cw: 0, ch: 0, dpr: 1, hover: null, pendente: false };

    function medir() {
        const r = area.getBoundingClientRect();
        v2.dpr = Math.min(window.devicePixelRatio || 1, 2);
        v2.cw = Math.max(200, Math.floor(r.width));
        v2.ch = Math.max(200, Math.floor(r.height));
        tela.width = v2.cw * v2.dpr; tela.height = v2.ch * v2.dpr;
        tela.style.width = v2.cw + "px"; tela.style.height = v2.ch + "px";
    }
    function ajustar2d() {
        const livreW = v2.cw - REGUA - 24, livreH = v2.ch - REGUA - 24;
        v2.s = Math.max(1, Math.min(48, Math.min(livreW / vol.W, livreH / vol.L)));
        v2.ox = REGUA + (v2.cw - REGUA - vol.W * v2.s) / 2;
        v2.oy = REGUA + (v2.ch - REGUA - vol.L * v2.s) / 2;
        pedir2d();
    }
    function zoom2d(fator, px, py) {
        const s2 = Math.max(1, Math.min(96, v2.s * fator));
        const k = s2 / v2.s;
        v2.ox = px - (px - v2.ox) * k; v2.oy = py - (py - v2.oy) * k;
        v2.s = s2;
        pedir2d();
    }
    const pedir2d = () => { if (!v2.pendente) { v2.pendente = true; requestAnimationFrame(desenhar2d); } };

    function passoRegua(s) {
        for (const p of [1, 2, 5, 10, 20, 25, 50, 100]) if (p * s >= 34) return p;
        return 200;
    }

    function desenhar2d() {
        v2.pendente = false;
        if (e.vista !== "2d") return;
        const { s, ox, oy, cw, ch } = v2;
        const W = vol.W, L = vol.L, y = e.camada - 1;
        const cx = Math.floor(W / 2), cz = Math.floor(L / 2);
        ctx.setTransform(v2.dpr, 0, 0, v2.dpr, 0, 0);
        ctx.fillStyle = "#15131a"; ctx.fillRect(0, 0, cw, ch);

        const x0 = Math.max(0, Math.floor((REGUA - ox) / s)), x1 = Math.min(W - 1, Math.ceil((cw - ox) / s));
        const z0 = Math.max(0, Math.floor((REGUA - oy) / s)), z1 = Math.min(L - 1, Math.ceil((ch - oy) / s));
        const X = (x) => Math.round(ox + x * s), Z = (z) => Math.round(oy + z * s);

        // área da forma
        ctx.fillStyle = "#1d1b24"; ctx.fillRect(X(0), Z(0), X(W) - X(0), Z(L) - Z(0));

        const bisel = s >= 7 ? Math.max(1, Math.round(s / 8)) : 0;
        for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
            const a = X(x), b = Z(z), w = X(x + 1) - a, hh = Z(z + 1) - b;
            if (tem(x, y, z)) {
                ctx.fillStyle = "#5d9b3a"; ctx.fillRect(a, b, w, hh);
                if (bisel) {
                    ctx.fillStyle = "#8fd35d"; ctx.fillRect(a, b, w, bisel); ctx.fillRect(a, b, bisel, hh);
                    ctx.fillStyle = "#2b5212"; ctx.fillRect(a, b + hh - bisel, w, bisel); ctx.fillRect(a + w - bisel, b, bisel, hh);
                }
            } else if (e.fantasma && y > 0 && tem(x, y - 1, z)) {
                ctx.fillStyle = "rgba(162,116,255,.30)"; ctx.fillRect(a + 1, b + 1, w - 2, hh - 2);
            }
        }
        // grade de blocos
        if (s >= 6) {
            ctx.fillStyle = "rgba(255,255,255,.07)";
            for (let x = x0; x <= x1 + 1; x++) ctx.fillRect(X(x), Z(z0), 1, Z(z1 + 1) - Z(z0));
            for (let z = z0; z <= z1 + 1; z++) ctx.fillRect(X(x0), Z(z), X(x1 + 1) - X(x0), 1);
        }
        // linhas a cada 5 (a partir do centro)
        if (e.grade) {
            ctx.fillStyle = "rgba(255,255,255,.28)";
            for (let x = cx % 5; x <= W; x += 5) if (x >= x0 && x <= x1 + 1) ctx.fillRect(X(x), Z(0), 1, Z(L) - Z(0));
            for (let z = cz % 5; z <= L; z += 5) if (z >= z0 && z <= z1 + 1) ctx.fillRect(X(0), Z(z), X(W) - X(0), 1);
        }
        // eixos do centro (cores da logo)
        const eixoX = W % 2 ? ox + (cx + 0.5) * s : ox + (W / 2) * s;
        const eixoZ = L % 2 ? oy + (cz + 0.5) * s : oy + (L / 2) * s;
        ctx.fillStyle = "rgba(34,227,234,.85)"; ctx.fillRect(Math.round(eixoX) - 1, Z(0), 2, Z(L) - Z(0));
        ctx.fillStyle = "rgba(255,43,69,.85)"; ctx.fillRect(X(0), Math.round(eixoZ) - 1, X(W) - X(0), 2);

        // números: blocos seguidos em cada trecho + total da linha
        if (e.numeros && s >= 9) {
            const fonte = Math.max(9, Math.min(18, Math.floor(s * 0.6)));
            ctx.font = "600 " + fonte + "px 'Pixelify Sans', monospace";
            ctx.textBaseline = "middle";
            for (let z = z0; z <= z1; z++) {
                let ini = -1, total = 0, ultimo = -1;
                for (let x = 0; x <= W; x++) {
                    const cheio = x < W && tem(x, y, z);
                    if (cheio) { if (ini < 0) ini = x; total++; ultimo = x; }
                    else if (ini >= 0) {
                        const n = x - ini, cxp = ox + (ini + n / 2) * s, cyp = oy + (z + 0.5) * s;
                        if (n * s >= ctx.measureText(String(n)).width + 4) {
                            ctx.textAlign = "center";
                            ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillText(String(n), cxp + 1, cyp + 1);
                            ctx.fillStyle = "#fff"; ctx.fillText(String(n), cxp, cyp);
                        }
                        ini = -1;
                    }
                }
                if (total) {
                    ctx.textAlign = "left";
                    ctx.fillStyle = "#ffff55";
                    ctx.fillText("= " + total, ox + (ultimo + 1) * s + 6, oy + (z + 0.5) * s);
                }
            }
        }
        // bloco sob o cursor
        if (v2.hover) {
            const [hx, hz] = v2.hover;
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
            ctx.strokeRect(X(hx) + 1, Z(hz) + 1, Math.max(2, X(hx + 1) - X(hx) - 2), Math.max(2, Z(hz + 1) - Z(hz) - 2));
        }

        minimapa();

        // réguas (coordenadas relativas ao centro)
        ctx.fillStyle = "#0f0e12"; ctx.fillRect(0, 0, cw, REGUA); ctx.fillRect(0, 0, REGUA, ch);
        ctx.fillStyle = "#2a2733"; ctx.fillRect(0, REGUA - 1, cw, 1); ctx.fillRect(REGUA - 1, 0, 1, ch);
        const passo = passoRegua(s);
        ctx.font = "500 11px 'Pixelify Sans', monospace"; ctx.fillStyle = "#a19cb0"; ctx.textBaseline = "middle"; ctx.textAlign = "center";
        const rx0 = Math.ceil((x0 - cx) / passo) * passo, rz0 = Math.ceil((z0 - cz) / passo) * passo;
        for (let r = rx0; r + cx <= x1; r += passo) {
            const px = ox + (r + cx + 0.5) * s;
            if (px < REGUA + 8) continue;
            ctx.fillStyle = r === 0 ? "#22e3ea" : "#a19cb0"; ctx.fillText(String(r), px, REGUA / 2);
            ctx.fillRect(Math.round(px), REGUA - 4, 1, 3);
        }
        ctx.save(); ctx.translate(REGUA / 2, 0); ctx.rotate(-Math.PI / 2);
        for (let r = rz0; r + cz <= z1; r += passo) {
            const py = oy + (r + cz + 0.5) * s;
            if (py < REGUA + 8) continue;
            ctx.fillStyle = r === 0 ? "#ff2b45" : "#a19cb0"; ctx.fillText(String(r), -py, 0);
        }
        ctx.restore();
        ctx.fillStyle = "#15131a"; ctx.fillRect(0, 0, REGUA - 1, REGUA - 1);

        info();
    }

    // ---- minimapa: aparece quando a forma não cabe inteira na tela ----
    const mini = { chave: "", c: document.createElement("canvas"), r: null, versao: 0 };
    function minimapa() {
        const W = vol.W, L = vol.L, { s, ox, oy, cw, ch } = v2;
        const cabe = ox >= REGUA - 1 && oy >= REGUA - 1 && ox + W * s <= cw + 1 && oy + L * s <= ch + 1;
        if (cabe) { mini.r = null; return; }
        const lado = 150, k = lado / Math.max(W, L);
        const mw = Math.max(1, Math.round(W * k)), mh = Math.max(1, Math.round(L * k));
        const chave = mini.versao + "|" + e.camada + "|" + mw + "x" + mh;
        if (chave !== mini.chave) {
            mini.chave = chave;
            mini.c.width = mw; mini.c.height = mh;
            const g = mini.c.getContext("2d"), img = g.createImageData(mw, mh), y = e.camada - 1;
            for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) {
                const x = Math.min(W - 1, Math.floor(i / k)), z = Math.min(L - 1, Math.floor(j / k));
                const o = (i + j * mw) * 4, cheio = tem(x, y, z);
                img.data[o] = cheio ? 106 : 36; img.data[o + 1] = cheio ? 171 : 33; img.data[o + 2] = cheio ? 67 : 44; img.data[o + 3] = 255;
            }
            g.putImageData(img, 0, 0);
        }
        const mx = cw - mw - 12, my = ch - mh - 12;
        mini.r = { x: mx, y: my, w: mw, h: mh, k };
        ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(mini.c, mx, my);
        // retângulo da parte visível
        const vx = (REGUA - ox) / s * k, vy = (REGUA - oy) / s * k, vw = (cw - REGUA) / s * k, vh = (ch - REGUA) / s * k;
        ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(mx + vx, my + vy, vw, vh);
        ctx.restore();
    }
    function irPeloMinimapa(px, py) {
        const r = mini.r;
        const bx = (px - r.x) / r.k, bz = (py - r.y) / r.k;      // bloco no centro da vista
        v2.ox = REGUA + (v2.cw - REGUA) / 2 - bx * v2.s;
        v2.oy = REGUA + (v2.ch - REGUA) / 2 - bz * v2.s;
        pedir2d();
    }
    const noMinimapa = (px, py) => mini.r && px >= mini.r.x - 4 && py >= mini.r.y - 4 && px <= mini.r.x + mini.r.w + 4 && py <= mini.r.y + mini.r.h + 4;

    function celulaEm(px, py) {
        const x = Math.floor((px - v2.ox) / v2.s), z = Math.floor((py - v2.oy) / v2.s);
        return x >= 0 && z >= 0 && x < vol.W && z < vol.L ? [x, z] : null;
    }
    function info() {
        const partes = [];
        if (e.vista === "2d") {
            partes.push(t("circ.zoom", { n: NK.num2(v2.s) }));
            if (v2.hover) {
                const [x, z] = v2.hover, rx = x - Math.floor(vol.W / 2), rz = z - Math.floor(vol.L / 2);
                partes.unshift(t("circ.pos", { x: rx, z: rz }) + (rx === 0 && rz === 0 ? " (" + t("circ.center") + ")" : "") + (tem(x, e.camada - 1, z) ? " · ■ " + t("circ.pos_block") : ""));
            }
        }
        $("info").textContent = partes.join("  ·  ");
    }

    // arrastar / pinçar / roda
    const ponteiros = new Map();
    let arrasto = null, pinca = null;
    tela.addEventListener("pointerdown", (ev) => {
        tela.setPointerCapture(ev.pointerId); tela.focus({ preventScroll: true });
        ponteiros.set(ev.pointerId, [ev.offsetX, ev.offsetY]);
        if (ponteiros.size === 1 && noMinimapa(ev.offsetX, ev.offsetY)) { arrasto = { mini: true }; irPeloMinimapa(ev.offsetX, ev.offsetY); return; }
        if (ponteiros.size === 1) arrasto = { x: ev.offsetX, y: ev.offsetY, ox: v2.ox, oy: v2.oy };
        if (ponteiros.size === 2) {
            const [a, b] = [...ponteiros.values()];
            pinca = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: v2.s };
            arrasto = null;
        }
    });
    tela.addEventListener("pointermove", (ev) => {
        if (ponteiros.has(ev.pointerId)) ponteiros.set(ev.pointerId, [ev.offsetX, ev.offsetY]);
        if (pinca && ponteiros.size === 2) {
            const [a, b] = [...ponteiros.values()];
            const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
            zoom2d((pinca.s * d / pinca.d) / v2.s, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
            return;
        }
        if (arrasto && arrasto.mini) { irPeloMinimapa(ev.offsetX, ev.offsetY); return; }
        if (arrasto) {
            v2.ox = arrasto.ox + ev.offsetX - arrasto.x; v2.oy = arrasto.oy + ev.offsetY - arrasto.y;
            tela.style.cursor = "grabbing";
            pedir2d(); return;
        }
        const c = celulaEm(ev.offsetX, ev.offsetY);
        if (String(c) !== String(v2.hover)) { v2.hover = c; pedir2d(); }
    });
    const soltar = (ev) => {
        ponteiros.delete(ev.pointerId);
        if (ponteiros.size < 2) pinca = null;
        if (!ponteiros.size) { arrasto = null; tela.style.cursor = ""; }
    };
    tela.addEventListener("pointerup", soltar);
    tela.addEventListener("pointercancel", soltar);
    tela.addEventListener("pointerleave", () => { if (!arrasto) { v2.hover = null; pedir2d(); } });
    tela.addEventListener("wheel", (ev) => { ev.preventDefault(); zoom2d(Math.pow(1.0015, -ev.deltaY * (ev.deltaMode ? 30 : 1)), ev.offsetX, ev.offsetY); }, { passive: false });
    tela.addEventListener("dblclick", ajustar2d);

    // =====================================================================
    // Vista 3D (Three.js carregado sob demanda)
    // =====================================================================
    const v3 = { pronto: false, carregando: false, THREE: null, renderer: null, scene: null, camera: null, malha: null, chao: null,
                 alvo: null, theta: Math.PI / 4, phi: 1.0, dist: 40, pendente: false, sujo: true };

    async function iniciar3d() {
        if (v3.pronto || v3.carregando) return;
        v3.carregando = true;
        const msg = $("msg3d");
        msg.hidden = false; msg.textContent = t("circ.loading3d");
        try {
            const THREE = v3.THREE = await import(window.NK_THREE);
            const c = document.createElement("canvas");
            if (!(c.getContext("webgl2") || c.getContext("webgl"))) throw new Error("webgl");
            const renderer = v3.renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            $("cena3d").appendChild(renderer.domElement);
            v3.scene = new THREE.Scene();
            v3.scene.background = new THREE.Color(0x1a1830);
            v3.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
            v3.alvo = new THREE.Vector3();
            v3.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a2f24, 1.15));
            const sol = new THREE.DirectionalLight(0xffffff, 1.5);
            sol.position.set(0.6, 1, 0.35);
            v3.scene.add(sol);
            v3.material = new THREE.MeshLambertMaterial({ map: texturaBloco(THREE) });
            v3.geo = new THREE.BoxGeometry(1, 1, 1);
            controles3d(renderer.domElement);
            v3.pronto = true;
            msg.hidden = true;
            redimensionar();
            v3.sujo = true;
            ajustar3d();
        } catch (err) {
            msg.hidden = false;
            msg.textContent = t("circ.no_webgl");
        }
        v3.carregando = false;
    }

    // textura 16×16 em tons de cinza (é tingida pela cor de cada bloco)
    function texturaBloco(THREE) {
        const c = document.createElement("canvas"); c.width = c.height = 16;
        const g = c.getContext("2d");
        let seed = 7;
        const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const v = 200 + Math.floor(r() * 45);
            g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.fillRect(x, y, 1, 1);
        }
        g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16);
        g.fillStyle = "rgba(0,0,0,.30)"; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16);
        const tex = new THREE.CanvasTexture(c);
        tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    function construir3d() {
        if (!v3.pronto) return;
        const THREE = v3.THREE, { W, H, L } = vol;
        const topo = e.cortar ? e.camada - 1 : H - 1, atual = e.camada - 1;
        const visivel = (x, y, z) => y <= topo && tem(x, y, z);
        const pos = [];
        for (let y = 0; y <= topo; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
            if (!visivel(x, y, z)) continue;
            if (visivel(x + 1, y, z) && visivel(x - 1, y, z) && visivel(x, y + 1, z) && visivel(x, y - 1, z) && visivel(x, y, z + 1) && visivel(x, y, z - 1)) continue;
            pos.push(x, y, z);
        }
        if (v3.malha) { v3.scene.remove(v3.malha); v3.malha.dispose(); }
        const n = pos.length / 3;
        const malha = new THREE.InstancedMesh(v3.geo, v3.material, Math.max(1, n));
        malha.count = n;
        const m = new THREE.Matrix4(), cor = new THREE.Color();
        const VERDE = new THREE.Color(0x6aab43), ATUAL = new THREE.Color(0xc6ff5a), ACIMA = new THREE.Color(0x4f7d36);
        for (let i = 0; i < n; i++) {
            const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
            m.makeTranslation(x - W / 2 + 0.5, y + 0.5, z - L / 2 + 0.5);
            malha.setMatrixAt(i, m);
            cor.copy(H > 1 && y === atual ? ATUAL : y > atual ? ACIMA : VERDE);
            const k = 0.92 + ((x * 7 + z * 13 + y * 5) % 9) / 100;   // leve variação entre blocos
            cor.multiplyScalar(k);
            malha.setColorAt(i, cor);
        }
        malha.instanceMatrix.needsUpdate = true;
        if (malha.instanceColor) malha.instanceColor.needsUpdate = true;
        v3.malha = malha;
        v3.scene.add(malha);

        if (v3.chao) { v3.scene.remove(v3.chao); v3.chao.geometry.dispose(); }
        const lado = Math.max(W, L) + 6;
        v3.chao = new THREE.GridHelper(lado, lado, 0x5b5470, 0x2e2a3a);
        v3.scene.add(v3.chao);
        v3.sujo = false;
        pedir3d();
    }

    function ajustar3d() {
        if (!v3.pronto) return;
        const { W, H, L } = vol;
        v3.alvo.set(0, H / 2, 0);
        v3.dist = Math.max(W, L, H) * 1.7 + 6;
        v3.theta = Math.PI / 4; v3.phi = H > 1 ? 1.05 : 0.7;
        pedir3d();
    }
    const pedir3d = () => { if (!v3.pendente) { v3.pendente = true; requestAnimationFrame(render3d); } };
    function render3d() {
        v3.pendente = false;
        if (!v3.pronto || e.vista !== "3d") return;
        if (v3.sujo) construir3d();
        const { camera, alvo } = v3;
        camera.position.set(
            alvo.x + v3.dist * Math.sin(v3.phi) * Math.sin(v3.theta),
            alvo.y + v3.dist * Math.cos(v3.phi),
            alvo.z + v3.dist * Math.sin(v3.phi) * Math.cos(v3.theta));
        camera.lookAt(alvo);
        v3.renderer.render(v3.scene, camera);
    }
    function zoom3d(fator) { v3.dist = Math.max(2, Math.min(3000, v3.dist / fator)); pedir3d(); }

    function controles3d(el) {
        const p = new Map();
        let modo = null, ult = null, pinc = null;
        el.addEventListener("contextmenu", (ev) => ev.preventDefault());
        el.addEventListener("pointerdown", (ev) => {
            el.setPointerCapture(ev.pointerId);
            p.set(ev.pointerId, [ev.clientX, ev.clientY]);
            modo = (ev.button === 2 || ev.shiftKey) ? "mover" : "girar";
            ult = [ev.clientX, ev.clientY];
            if (p.size === 2) { const [a, b] = [...p.values()]; pinc = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), dist: v3.dist }; modo = null; }
        });
        el.addEventListener("pointermove", (ev) => {
            if (!p.has(ev.pointerId)) return;
            p.set(ev.pointerId, [ev.clientX, ev.clientY]);
            if (pinc && p.size === 2) {
                const [a, b] = [...p.values()];
                v3.dist = Math.max(2, pinc.dist * pinc.d / Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])));
                pedir3d(); return;
            }
            if (!modo) return;
            const dx = ev.clientX - ult[0], dy = ev.clientY - ult[1];
            ult = [ev.clientX, ev.clientY];
            if (modo === "girar") {
                v3.theta -= dx * 0.008;
                v3.phi = Math.max(0.05, Math.min(Math.PI - 0.05, v3.phi - dy * 0.008));
            } else {
                const THREE = v3.THREE, cam = v3.camera;
                const k = v3.dist * 0.0018;
                const dir = new THREE.Vector3(), dirX = new THREE.Vector3(), dirY = new THREE.Vector3();
                cam.getWorldDirection(dir);
                dirX.crossVectors(dir, cam.up).normalize();
                dirY.crossVectors(dirX, dir).normalize();
                v3.alvo.addScaledVector(dirX, -dx * k).addScaledVector(dirY, dy * k);
            }
            pedir3d();
        });
        const fim = (ev) => { p.delete(ev.pointerId); if (p.size < 2) pinc = null; if (!p.size) modo = null; };
        el.addEventListener("pointerup", fim);
        el.addEventListener("pointercancel", fim);
        el.addEventListener("wheel", (ev) => { ev.preventDefault(); zoom3d(Math.pow(1.0015, -ev.deltaY * (ev.deltaMode ? 30 : 1))); }, { passive: false });
        el.addEventListener("dblclick", ajustar3d);
    }

    // =====================================================================
    // Interface
    // =====================================================================
    function redimensionar() {
        medir();
        if (v3.pronto) {
            v3.renderer.setSize(v2.cw, v2.ch, false);
            v3.renderer.domElement.style.width = v2.cw + "px"; v3.renderer.domElement.style.height = v2.ch + "px";
            v3.camera.aspect = v2.cw / v2.ch; v3.camera.updateProjectionMatrix();
            pedir3d();
        }
        pedir2d();
    }
    new ResizeObserver(() => { const antes = [v2.cw, v2.ch]; redimensionar(); if (!antes[0]) ajustar2d(); }).observe(area);

    function trocarVista(v) {
        e.vista = v;
        document.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-selected", b.dataset.vista === v));
        tela.hidden = v !== "2d";
        $("cena3d").hidden = v !== "3d";
        if (v === "2d") $("msg3d").hidden = true;
        $("ajuda").textContent = t(v === "2d" ? "circ.help_2d" : "circ.help_3d");
        if (v === "3d") { if (!v3.pronto) iniciar3d(); else { redimensionar(); pedir3d(); } }
        else pedir2d();
        info();
    }
    $("abasVista").addEventListener("click", (ev) => { const b = ev.target.closest("[data-vista]"); if (b) trocarVista(b.dataset.vista); });

    function linhasTexto() {
        const y = e.camada - 1, cx = Math.floor(vol.W / 2);
        let html = "";
        for (let z = 0; z < vol.L; z++) {
            const seg = []; let ini = -1, n = 0;
            for (let x = 0; x <= vol.W; x++) {
                if (x < vol.W && tem(x, y, z)) { if (ini < 0) ini = x; n++; }
                else if (ini >= 0) { seg.push(ini === x - 1 ? String(ini - cx) : (ini - cx) + "…" + (x - 1 - cx)); ini = -1; }
            }
            if (n) html += "<li><b>" + NK.esc(t("circ.row", { n: z + 1 })) + "</b> · " + NK.esc(t("circ.row_blocks", { n })) + " <span>(" + seg.join(", ") + ")</span></li>";
        }
        $("linhas").innerHTML = html;
    }
    const stacks = (n) => t("circ.stacks", { a: NK.num(Math.floor(n / 64)), b: n % 64 });

    function lerCampos() {
        const esferico = e.forma === "esfera" || e.forma === "cupula";
        const max = esferico ? 151 : 255;
        e.w = Math.max(1, Math.min(max, parseInt($("largura").value, 10) || 1));
        e.l = Math.max(1, Math.min(255, parseInt($("comprimento").value, 10) || 1));
        e.h = Math.max(1, Math.min(128, parseInt($("altura").value, 10) || 1));
    }

    function atualizarCamada() {
        e.camada = Math.max(1, Math.min(vol.H, e.camada));
        $("camada").max = vol.H; $("camada").value = e.camada;
        $("campoCamada").hidden = vol.H === 1;
        $("rotCamada").textContent = t("circ.layer_of", { a: e.camada, b: vol.H });
        $("selo").textContent = vol.H > 1 ? t("circ.layer_of", { a: e.camada, b: vol.H }) : "";
        const n = vol.porCamada[e.camada - 1] || 0;
        $("nCamada").textContent = NK.num(n);
        linhasTexto();
        pedir2d();
        if (H3d()) { v3.sujo = true; pedir3d(); }
    }
    const H3d = () => v3.pronto;

    function atualizar(forcarAjuste) {
        lerCampos();
        const esferico = e.forma === "esfera" || e.forma === "cupula";
        document.querySelectorAll("[data-forma]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.forma === e.forma));
        document.querySelectorAll("[data-preench]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.preench === e.preench));
        $("campoComp").hidden = e.forma !== "elipse";
        $("campoAltura").hidden = esferico;
        $("rotLargura").textContent = t(e.forma === "elipse" ? "circ.width" : "circ.diameter");
        $("larguraRange").value = Math.min(e.w, 121);

        const mudou = calcular();
        const t0 = vol.total;
        $("nTotal").textContent = NK.num(t0) + (t0 >= 64 ? " · " + stacks(t0) : "");
        $("nTamanho").textContent = vol.H > 1 ? vol.W + " × " + vol.H + " × " + vol.L : vol.W + " × " + vol.L;
        if (mudou || forcarAjuste) {
            e.camada = esferico ? Math.ceil(vol.H / 2) : vol.H;
            ajustar2d();
            if (v3.pronto) ajustar3d();
        }
        atualizarCamada();
        v3.sujo = true;
        pedir3d();
    }

    // eventos dos controles
    $("formas").addEventListener("click", (ev) => { const b = ev.target.closest("[data-forma]"); if (b) { e.forma = b.dataset.forma; atualizar(true); } });
    $("preench").addEventListener("click", (ev) => { const b = ev.target.closest("[data-preench]"); if (b) { e.preench = b.dataset.preench; atualizar(); } });
    ["largura", "comprimento", "altura"].forEach((id) => $(id).addEventListener("input", () => atualizar()));
    $("larguraRange").addEventListener("input", () => { $("largura").value = $("larguraRange").value; atualizar(); });
    $("camada").addEventListener("input", () => { e.camada = parseInt($("camada").value, 10); atualizarCamada(); });
    $("camMenos").addEventListener("click", () => { e.camada--; atualizarCamada(); });
    $("camMais").addEventListener("click", () => { e.camada++; atualizarCamada(); });
    $("fantasma").addEventListener("change", () => { e.fantasma = $("fantasma").checked; pedir2d(); });
    $("grade").addEventListener("change", () => { e.grade = $("grade").checked; pedir2d(); });
    $("numeros").addEventListener("change", () => {
        e.numeros = $("numeros").checked;
        if (e.numeros && v2.s < 14) zoom2d(16 / v2.s, v2.cw / 2, v2.ch / 2);   // números precisam de blocos maiores
        pedir2d();
    });
    $("cortar").addEventListener("change", () => { e.cortar = $("cortar").checked; v3.sujo = true; pedir3d(); });

    $("zoomMais").addEventListener("click", () => e.vista === "2d" ? zoom2d(1.3, v2.cw / 2, v2.ch / 2) : zoom3d(1.25));
    $("zoomMenos").addEventListener("click", () => e.vista === "2d" ? zoom2d(1 / 1.3, v2.cw / 2, v2.ch / 2) : zoom3d(0.8));
    $("zoomAjustar").addEventListener("click", () => e.vista === "2d" ? ajustar2d() : ajustar3d());
    $("telaCheia").addEventListener("click", () => {
        const vis = $("visor");
        if (document.fullscreenElement) document.exitFullscreen();
        else if (vis.requestFullscreen) vis.requestFullscreen().catch(() => vis.classList.toggle("cheio"));
        else vis.classList.toggle("cheio");
    });
    document.addEventListener("fullscreenchange", () => setTimeout(() => { redimensionar(); e.vista === "2d" ? ajustar2d() : ajustar3d(); }, 60));

    // teclado: ← → / PgUp PgDn trocam de camada (fora de campos de texto)
    document.addEventListener("keydown", (ev) => {
        const tg = ev.target;
        if (tg.isContentEditable || tg.tagName === "TEXTAREA" || tg.tagName === "SELECT" ||
            (tg.tagName === "INPUT" && !["checkbox", "radio", "button", "range"].includes(tg.type))) return;
        if (ev.target.id === "camada") return;
        if (ev.key === "ArrowRight" || ev.key === "PageUp") { e.camada++; atualizarCamada(); ev.preventDefault(); }
        else if (ev.key === "ArrowLeft" || ev.key === "PageDown") { e.camada--; atualizarCamada(); ev.preventDefault(); }
        else if (ev.key === "+" || ev.key === "=") $("zoomMais").click();
        else if (ev.key === "-") $("zoomMenos").click();
    });

    medir();
    atualizar(true);
})();
