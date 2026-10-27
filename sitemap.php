<?php
/*
 *  Sitemap para o Google (https://nekyoh.tech/sitemap.xml).
 *  Gerado a partir de config.php: a página inicial + todas as ferramentas locais
 *  que não estão como 'breve'. Ferramenta nova entra sozinha.
 */
require __DIR__ . '/config.php';

$base = 'https://' . $site['dominio'] . '/';
$paginas = [''];
foreach ($ferramentas as $f) {
    if (($f['tipo'] ?? '') === 'local' && ($f['estado'] ?? '') !== 'breve') $paginas[] = $f['url'];
}

// Data da última mudança: a do arquivo mais recente de cada página
$data = function (string $url) {
    $arq = __DIR__ . '/' . $url . 'index.php';
    $t = max(@filemtime($arq) ?: 0, @filemtime(__DIR__ . '/config.php') ?: 0);
    return date('Y-m-d', $t ?: time());
};

header('Content-Type: application/xml; charset=UTF-8');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
foreach ($paginas as $p) {
    $loc = htmlspecialchars($base . $p, ENT_XML1);
    echo "  <url>\n    <loc>$loc</loc>\n    <lastmod>" . $data($p) . "</lastmod>\n";
    foreach (array_keys($site['idiomas']) as $l) {
        echo "    <xhtml:link rel=\"alternate\" hreflang=\"$l\" href=\"$loc?lang=$l\"/>\n";
    }
    echo "    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"$loc\"/>\n  </url>\n";
}
echo "</urlset>\n";
