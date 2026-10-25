<?php
/*
 *  Núcleo do site: idioma + layout partilhado.
 *  Cada página define $BASE (caminho até à raiz, ex: '' ou '../../')
 *  e faz require deste ficheiro.
 */
if (!isset($BASE)) $BASE = '';

require __DIR__ . '/../config.php';

/* ---------------- idioma ----------------
 * Um só idioma para o site inteiro (home, calculadora, SchematicCount).
 * Ordem: ?lang=xx  →  cookie "nekyoh_lang"  →  cookie antigo "sc_lang"
 *        →  idioma do navegador (Accept-Language, respeitando q=)  →  padrão
 * Devolve [idioma, origem]; origem 'escolha' = a pessoa escolheu (fica salvo).
 */
const NK_COOKIE = 'nekyoh_lang';

function guardar_idioma(string $l): void {
    setcookie(NK_COOKIE, $l, [
        'expires' => time() + 31536000, 'path' => '/', 'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
    $_COOKIE[NK_COOKIE] = $l;
}

function idioma_do_navegador(string $header, array $disponiveis): ?string {
    $cands = [];
    foreach (explode(',', $header) as $i => $parte) {
        $bits = explode(';', trim($parte));
        $tag = strtolower(trim($bits[0]));
        if ($tag === '' || $tag === '*') continue;
        $q = 1.0;
        foreach (array_slice($bits, 1) as $p) if (preg_match('/^\s*q\s*=\s*([0-9.]+)\s*$/', $p, $m)) $q = (float)$m[1];
        if ($q > 0) $cands[] = [$q, -$i, substr($tag, 0, 2)];
    }
    rsort($cands);
    foreach ($cands as [, , $l]) if (isset($disponiveis[$l])) return $l;
    return null;
}

function detectar_idioma(array $disponiveis, string $padrao): array {
    $ok = fn($l) => is_string($l) && isset($disponiveis[$l]);

    if (isset($_GET['lang']) && $ok($_GET['lang'])) {
        guardar_idioma($_GET['lang']);
        return [$_GET['lang'], 'escolha'];
    }
    if ($ok($_COOKIE[NK_COOKIE] ?? null)) return [$_COOKIE[NK_COOKIE], 'escolha'];
    if ($ok($_COOKIE['sc_lang'] ?? null)) {            // escolha feita na versão antiga do SchematicCount
        guardar_idioma($_COOKIE['sc_lang']);
        return [$_COOKIE['sc_lang'], 'escolha'];
    }
    return [idioma_do_navegador($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '', $disponiveis) ?? $padrao, 'auto'];
}

[$LANG, $LANG_ORIGEM] = detectar_idioma($site['idiomas'], $site['idioma_padrao']);
header('Vary: Accept-Language, Cookie');
$TXT  = require __DIR__ . "/../lang/{$LANG}.php";
$TXT_PADRAO = $LANG === 'pt' ? $TXT : require __DIR__ . '/../lang/pt.php';

/** Texto traduzido. t('hero.kicker', ['n' => 3]) troca {n} por 3. */
function t(string $chave, array $vars = []) {
    global $TXT, $TXT_PADRAO;
    $v = $TXT[$chave] ?? $TXT_PADRAO[$chave] ?? $chave;
    if (is_string($v)) foreach ($vars as $k => $val) $v = str_replace('{' . $k . '}', (string)$val, $v);
    return $v;
}

/** Todas as chaves que começam por $prefixo (para mandar ao JavaScript). */
function t_grupo(string $prefixo): array {
    global $TXT, $TXT_PADRAO;
    $out = [];
    foreach (array_merge($TXT_PADRAO, $TXT) as $k => $v) if (str_starts_with($k, $prefixo)) $out[$k] = $v;
    return $out;
}

function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/** Link para a página atual noutro idioma (mantém outros parâmetros). */
function link_idioma(string $l): string {
    $q = $_GET; $q['lang'] = $l;
    return '?' . http_build_query($q);
}

/** Ícone de item do Minecraft (mesma API do SchematicCount), com letra de reserva. */
function item_icone(string $item, string $alt = '', int $px = 32): string {
    $src = 'https://blocksitems.com/api/v1/items/minecraft:' . rawurlencode($item) . '/icon?size=32';
    $letra = strtoupper(substr($alt ?: $item, 0, 1));
    return '<span class="item" style="--px:' . $px . 'px" data-letra="' . e($letra) . '">'
         . '<img src="' . e($src) . '" alt="" width="' . $px . '" height="' . $px . '" loading="lazy" onerror="this.parentNode.classList.add(\'sem-img\');this.remove()">'
         . '</span>';
}

/* ---------------- layout ---------------- */

function pagina_inicio(string $titulo, string $descricao = '', string $classe = ''): void {
    global $BASE, $LANG, $site;
    $html_lang = ['pt' => 'pt-BR', 'en' => 'en', 'es' => 'es'][$LANG] ?? $LANG;
    ?>
<!DOCTYPE html>
<html lang="<?= e($html_lang) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($titulo) ?></title>
    <meta name="description" content="<?= e($descricao ?: t('meta.desc')) ?>">
    <meta name="theme-color" content="#14121a">
    <meta property="og:title" content="<?= e($titulo) ?>">
    <meta property="og:description" content="<?= e($descricao ?: t('meta.desc')) ?>">
    <meta property="og:image" content="<?= e($BASE) ?>assets/img/logo.png">
    <link rel="icon" type="image/png" sizes="32x32" href="<?= e($BASE) ?>assets/img/favicon_32.png">
    <link rel="icon" type="image/png" sizes="96x96" href="<?= e($BASE) ?>assets/img/favicon_96.png">
    <link rel="apple-touch-icon" href="<?= e($BASE) ?>assets/img/favicon_180.png">
    <?php site_estilos(); ?>
</head>
<body class="<?= e($classe) ?>">
<?php site_cabecalho(); }

/** Fontes + CSS do site (para páginas que montam o próprio <head>). */
function site_estilos(): void {
    global $BASE; ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;600;700&family=Archivo:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= e($BASE) ?>assets/css/nekyoh.css">
    <link rel="stylesheet" href="<?= e($BASE) ?>assets/css/ferramentas.css">
<?php }

/** Barra de navegação do site (logo, menu, idioma). */
function site_cabecalho(): void {
    global $BASE, $site; ?>
<header class="topo">
    <a class="marca" href="<?= e($BASE ?: './') ?>">
        <img src="<?= e($BASE) ?>assets/img/logo.png" alt="" width="36" height="36">
        <span><?= e($site['nome']) ?></span>
    </a>
    <nav class="menu">
        <a href="<?= e($BASE) ?>#ferramentas"><?= e(t('nav.tools')) ?></a>
        <a href="<?= e($BASE) ?>#canais"><?= e(t('nav.channels')) ?></a>
        <a href="<?= e($BASE) ?>#referencias"><?= e(t('nav.refs')) ?></a>
    </nav>
    <?php seletor_idioma(); ?>
</header>
<?php
}

function seletor_idioma(): void {
    global $LANG, $site;
    ?>
    <details class="idioma">
        <summary class="mc-btn mc-btn-sm" aria-label="<?= e(t('nav.lang')) ?>">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h12v12H2z M8 2v12 M2 8h12 M4 4c2 2 2 6 0 8 M12 4c-2 2-2 6 0 8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
            <span><?= e(strtoupper($LANG)) ?></span>
        </summary>
        <ul>
            <?php foreach ($site['idiomas'] as $cod => $nome): ?>
            <li><a href="<?= e(link_idioma($cod)) ?>" hreflang="<?= e($cod) ?>"<?= $cod === $LANG ? ' aria-current="true"' : '' ?>>
                <b><?= e(strtoupper($cod)) ?></b> <?= e($nome) ?>
            </a></li>
            <?php endforeach; ?>
        </ul>
    </details>
    <?php
}

function terreno(): void {
    echo '<div class="terreno" aria-hidden="true"><i class="t-grama"></i><i class="t-terra"></i><i class="t-pedra"></i><i class="t-deepslate"></i></div>';
}

function pagina_fim(): void {
    site_rodape(); ?>
</body>
</html>
<?php
}

/** Rodapé + script do site (para páginas que fecham o próprio <body>). */
function site_rodape(): void {
    global $BASE, $LANG, $LANG_ORIGEM, $site;
    ?>
<footer class="rodape">
    <div class="rodape-esq">
        <span class="versao"><?= e($site['nome']) ?> <?= e($site['versao']) ?></span>
        <span><?= e(t('footer.made_by', ['a' => implode(' & ', $site['autores'])])) ?></span>
    </div>
    <div class="rodape-dir">
        <span>© <?= date('Y') ?> <?= e($site['nome']) ?></span>
        <span class="aviso"><?= e(t('footer.disclaimer')) ?></span>
    </div>
</footer>
<script>window.NK_LANG = <?= json_encode($LANG) ?>; window.NK_LANG_ESCOLHIDO = <?= json_encode($LANG_ORIGEM === 'escolha') ?>;</script>
<script src="<?= e($BASE) ?>assets/js/site.js"></script>
<?php
}

/* ================================================================
 *  Ferramentas: textos por ferramenta, layout e dados partilhados
 * ================================================================ */

/** Junta os textos de uma ferramenta (ficheiro com ['pt'=>[...],'en'=>[...],'es'=>[...]]). */
function carregar_textos(string $arquivo): void {
    global $TXT, $TXT_PADRAO, $LANG;
    $todos = require $arquivo;
    $TXT_PADRAO = array_merge($TXT_PADRAO, $todos['pt'] ?? []);
    $TXT = array_merge($TXT, $todos[$LANG] ?? []);
}

/** Nomes oficiais dos itens (tabela do SchematicCount) no idioma atual: ['stone' => 'Pedra', ...] */
function nomes_itens(): array {
    global $LANG;
    static $cache = null;
    if ($cache !== null) return $cache;
    $tabela = require __DIR__ . '/../ferramentas/schematiccount/data/items.php';
    $cache = [];
    foreach ($tabela as $id => $info) {
        $curto = substr($id, 10); // tira "minecraft:"
        $cache[$curto] = $info['names'][$LANG] ?? $info['names']['en'] ?? $curto;
    }
    return $cache;
}

/** Abre uma página de ferramenta: <head>, navbar e cabeçalho (voltar + título + subtítulo). */
function ferramenta_inicio(string $id, string $classe = ''): void {
    global $BASE, $site;
    carregar_textos(__DIR__ . '/textos-ferramentas.php');
    pagina_inicio(t("tool.$id.name") . ' — ' . $site['nome'], t("tool.$id.desc"), trim("pg-ferramenta $classe"));
    ?>
<main>
    <div class="ferr-cab">
        <a class="voltar" href="<?= e($BASE) ?>">← <?= e(t('nav.back')) ?></a>
        <h1><?= e(t("tool.$id.name")) ?></h1>
        <p><?= e(t("tool.$id.desc")) ?></p>
    </div>
<?php
}

/**
 * Fecha a página: terreno, textos para o JS (prefixos pedidos + comuns), scripts e rodapé.
 * $dados vai para window.NK_DADOS (ex.: lista de itens).
 */
function ferramenta_fim(array $prefixos, array $scripts, array $dados = []): void {
    global $BASE, $LANG;
    echo "</main>\n";
    terreno();
    $txt = t_grupo('ui.');
    foreach ($prefixos as $p) $txt += t_grupo($p);
    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP;
    echo '<script>window.NK_I18N = ' . json_encode($txt, $flags) . ';'
       . ' window.NK_DADOS = ' . json_encode((object)$dados, $flags) . ';'
       . ' window.NK_LANG = ' . json_encode($LANG) . ';</script>' . "\n";
    echo '<script src="' . e($BASE) . 'assets/js/ferramentas.js"></script>' . "\n";
    echo '<script src="' . e($BASE) . 'assets/js/editor-texto.js"></script>' . "\n";
    foreach ($scripts as $s) echo '<script src="' . e($s) . '"></script>' . "\n";
    pagina_fim();
}

/** <select> de versão do Minecraft (partilhado entre os geradores de comandos). */
function seletor_versao(array $opcoes = ['a', 'b', 'c', 'd']): void {
    ?>
    <label class="campo">
        <span><?= e(t('ui.version')) ?></span>
        <select class="mc-input" data-versao>
            <?php foreach ($opcoes as $o): ?><option value="<?= e($o) ?>"><?= e(t("ui.ver.$o")) ?></option><?php endforeach; ?>
        </select>
    </label>
    <?php
}

/** Caixa de saída de comando com botão copiar. */
function caixa_saida(string $id, string $rotulo = ''): void {
    ?>
    <div class="saida">
        <div class="saida-cab"><span><?= e($rotulo ?: t('ui.command')) ?></span>
            <button type="button" class="mc-btn mc-btn-sm mc-btn-alt" data-copiar="#<?= e($id) ?>"><?= e(t('ui.copy')) ?></button></div>
        <pre class="saida-texto" id="<?= e($id) ?>"></pre>
        <p class="saida-info" id="<?= e($id) ?>Info"></p>
    </div>
    <?php
}
