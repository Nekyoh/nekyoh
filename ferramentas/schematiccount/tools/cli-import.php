<?php
/**
 * Testa a importação pela linha de comando, sem servidor web.
 *   php tools/cli-import.php arquivo.litematic [--json]
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/src/bootstrap.php';

$file = $argv[1] ?? null;
if (!$file || !is_file($file)) {
    fwrite(STDERR, "Uso: php tools/cli-import.php <arquivo> [--json]\n");
    exit(1);
}

$config = require dirname(__DIR__) . '/config.php';
ini_set('memory_limit', $config['memory_limit']);

$t = microtime(true);
try {
    $r = (new SchematicCount\Importer($config))->import(file_get_contents($file), basename($file));
} catch (SchematicCount\ImportException $e) {
    fwrite(STDERR, 'ERRO: ' . $e->key . ' ' . json_encode($e->params) . "\n");
    exit(2);
}
$ms = round((microtime(true) - $t) * 1000);

if (in_array('--json', $argv, true)) {
    echo json_encode($r, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
    exit;
}

printf("%s | %s | %d tipos | %d itens | %d ms | pico %.1f MB\n",
    $r['name'], $r['source']['format'] . (isset($r['source']['version']) ? ' v' . $r['source']['version'] : ''), $r['stats']['types'], $r['stats']['items'], $ms,
    memory_get_peak_usage(true) / 1048576);
foreach ($r['warnings'] as $w) {
    echo '  ! ' . $w['key'] . ' ' . json_encode($w['params']) . "\n";
}
foreach ($r['materials'] as $m) {
    printf("  %7d  %-40s %s\n", $m['total'], $m['id'], $m['names']['pt']);
}
