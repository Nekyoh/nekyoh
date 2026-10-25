/* Formatação e utilidades sem estado */
const SC = window.SC || (window.SC = {});

SC.ICON_URL = "https://blocksitems.com/api/v1/items/%s/icon?size=32";

SC.fmt = {
    number(n) {
        return Number(n || 0).toLocaleString(SC.i18n.locale());
    },

    escape(str) {
        return String(str ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    },

    prettyName(id) {
        const clean = String(id || "").replace(/^[^:]+:/, "").replace(/_/g, " ");
        return clean.replace(/\b\w/g, c => c.toUpperCase());
    },

    iconUrl(id) {
        return SC.ICON_URL.replace("%s", encodeURIComponent(id));
    },

    /**
     * Quebra uma quantidade em packs e unidades, usando o tamanho de stack do item
     * (64 para a maioria, 16 para placas/pérolas/baldes de neve, 1 para itens que não empilham).
     * Ex.: 2000 de pedra -> "31 packs + 16 un"
     */
    breakdown(qty, stack) {
        const t = SC.i18n.t;
        stack = stack > 0 ? stack : 64;
        if (qty <= 0) return "";
        if (stack === 1) return t("qty.units", { n: SC.fmt.number(qty) });

        const packs = Math.floor(qty / stack);
        const rest = qty - packs * stack;
        const parts = [];
        if (packs) parts.push(t(packs === 1 ? "qty.pack" : "qty.packs", { n: SC.fmt.number(packs) }));
        if (rest) parts.push(t("qty.units", { n: rest }));
        return parts.join(" + ") + (stack !== 64 && packs ? " " + t("qty.packOf", { n: stack }) : "");
    },

    size(sz) {
        return Array.isArray(sz) && sz.length === 3 ? sz.join(" × ") : null;
    },

    date(ts) {
        try {
            return new Date(ts).toLocaleDateString(SC.i18n.locale(), { day: "2-digit", month: "short", year: "numeric" });
        } catch {
            return "";
        }
    }
};
