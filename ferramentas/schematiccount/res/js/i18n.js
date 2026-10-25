/*
 * Idiomas da interface (pt, en, es).
 *
 * Os dicionários vêm embutidos pela página (window.SC_I18N, lido de lang/*.json pelo PHP).
 * O idioma é o mesmo do site Nekyoh inteiro: o PHP do site decide (?lang, cookie
 * "nekyoh_lang" ou idioma do navegador) e este script só mantém o localStorage em dia.
 */
(function () {
    const SC = window.SC || (window.SC = {});
    const cfg = window.SC_I18N || { lang: "en", supported: ["en"], fallback: "en", dicts: { en: {} } };
    const STORE_KEY = "nekyoh_lang";          // mesma chave do site (idioma único)
    const LEGACY_KEY = "schematiccount.lang"; // versão antiga
    const listeners = [];
    let lang = cfg.lang;

    function safeGet() {
        try { return localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_KEY); } catch { return null; }
    }
    function safeSet(v) {
        try { localStorage.setItem(STORE_KEY, v); } catch { /* sem storage: fica só o cookie */ }
    }
    function setCookie(v) {
        const secure = location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${cfg.cookie}=${encodeURIComponent(v)}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
    }

    function dict(code) {
        return cfg.dicts[code] || {};
    }

    function t(key, vars) {
        let text = dict(lang)[key];
        if (text === undefined) text = dict(cfg.fallback)[key];
        if (text === undefined) return key;
        if (vars) {
            for (const [k, v] of Object.entries(vars)) text = text.split("{" + k + "}").join(String(v));
        }
        return text;
    }

    function meta(code) {
        return dict(code || lang)._meta || {};
    }

    /** Troca os textos estáticos marcados com data-i18n / data-i18n-attr */
    function apply(root) {
        root = root || document;
        for (const el of root.querySelectorAll("[data-i18n]")) {
            el.textContent = t(el.dataset.i18n);
        }
        for (const el of root.querySelectorAll("[data-i18n-attr]")) {
            for (const pair of el.dataset.i18nAttr.split(";")) {
                const [attr, key] = pair.split(":");
                if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
            }
        }
        const m = meta();
        document.documentElement.lang = m.html || lang;
        document.title = t("page.title");
        const desc = document.querySelector('meta[name="description"]');
        if (desc) desc.setAttribute("content", t("page.description"));

        const short = document.getElementById("langShort");
        if (short) short.textContent = m.short || lang.toUpperCase();
        for (const b of document.querySelectorAll("#langMenu [data-lang]")) {
            const on = b.dataset.lang === lang;
            b.classList.toggle("active", on);
            b.setAttribute("aria-current", on ? "true" : "false");
        }
    }

    /**
     * Muda o idioma. save=true quando foi escolha da pessoa (fica salvo);
     * save=false para a detecção automática.
     */
    function setLang(code, save) {
        if (!cfg.supported.includes(code)) return;
        if (save) {
            safeSet(code);
            setCookie(code);
        }
        if (code === lang) return;
        lang = code;
        apply();
        for (const fn of listeners) fn(lang);
    }

    // ---------------- textos montados a partir de dados ----------------

    /** Nome do item no idioma atual (nomes oficiais do jogo, vindos do servidor) */
    function itemName(m) {
        return (m.names && (m.names[lang] || m.names[cfg.fallback])) || m.name || m.id;
    }

    /** "Litematica (.litematic v7), convertido de .schem" */
    function formatLabel(s) {
        if (!s) return "";
        switch (s.format) {
            case "litematic": {
                let out = t("format.litematic") + " (.litematic" + (s.version ? " " + t("format.version", { v: s.version }) : "") + ")";
                if (s.convertedFrom) out += ", " + t("format.convertedFrom", { ext: s.convertedFrom });
                return out;
            }
            case "schem":
                return t("format.schem") + " (.schem" + (s.version ? " " + t("format.version", { v: s.version }) : "") + ")";
            case "schematic":
                return t(s.variant === "schematica" ? "format.schematica" : "format.mcedit") + " (.schematic)";
            case "nbt":
                return t("format.nbt") + " (.nbt)";
            case "json":
                return t("format.json") + (s.multiplier > 1 ? " (" + t("format.multiplier", { n: s.multiplier }) + ")" : "");
            case "backup":
                return t("format.backup");
            case "legacy":
                return t("format.legacy");
        }
        return s.formatLabel || "";
    }

    /** Só o nome do formato, para o resumo da importação */
    function formatShort(s) {
        if (!s) return "";
        const map = { litematic: "format.litematic", schem: "format.schem", nbt: "format.nbt", json: "format.json", backup: "format.backup", legacy: "format.legacy" };
        if (s.format === "schematic") return t(s.variant === "schematica" ? "format.schematica" : "format.mcedit");
        return map[s.format] ? t(map[s.format]) : (s.formatLabel || "");
    }

    function fmtParams(params) {
        const out = {};
        for (const [k, v] of Object.entries(params || {})) {
            out[k] = typeof v === "number" ? SC.fmt.number(v) : v;
        }
        return out;
    }

    /** Avisos vêm como {key, params}; projetos antigos guardaram texto pronto */
    function warning(w) {
        if (typeof w === "string") return w;
        if (!w || !w.key) return "";
        return t("warn." + w.key, fmtParams(w.params));
    }

    function error(code, params) {
        const key = "error." + code;
        const text = t(key, fmtParams(params));
        return text === key ? t("error.internal") : text;
    }

    function locale() {
        return meta().locale || "en-US";
    }

    function onChange(fn) {
        listeners.push(fn);
    }

    SC.i18n = {
        get lang() { return lang; },
        t, apply, setLang, onChange, locale, meta,
        itemName, formatLabel, formatShort, warning, error,
    };

    // ---------------- escolha inicial ----------------
    // O site decide o idioma no servidor (?lang, cookie "nekyoh_lang" ou navegador).
    // Se veio de uma escolha, ela manda: só sincroniza o localStorage.
    const saved = safeGet();
    if (cfg.fromCookie) {
        if (saved !== lang) safeSet(lang);
    } else if (saved && cfg.supported.includes(saved) && saved !== lang) {
        // escolha salva só no navegador (cookie apagado): recupera o cookie e recarrega uma vez,
        // para o cabeçalho do site (feito no servidor) também vir no idioma certo
        setCookie(saved);
        let jaRecarregou = false;
        try { jaRecarregou = sessionStorage.getItem("nk_lang_reload") === saved; sessionStorage.setItem("nk_lang_reload", saved); } catch { jaRecarregou = true; }
        if (!jaRecarregou) location.reload();
        else { lang = saved; apply(); }
    }
    // sem escolha: o servidor já usou o idioma do navegador (Accept-Language)

    document.addEventListener("click", e => {
        const b = e.target.closest("#langMenu [data-lang]");
        if (b) setLang(b.dataset.lang, true);
    });
})();
