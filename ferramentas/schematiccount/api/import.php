<?php
/**
 * POST /api/import.php   (multipart/form-data, campo "file")
 *
 * Aceita .litematic, .schem, .schematic, .nbt e o .json exportado pelo Litematica.
 * Não guarda nada no servidor: devolve a lista de materiais e o navegador salva.
 *
 * Resposta: { ok: true, project: {...} }  ou  { ok: false, code: "file_too_big", params: {...} }
 * Os códigos de erro são traduzidos no navegador (lang/*.json, seção "errors").
 */

declare(strict_types=1);

require dirname(__DIR__) . '/src/bootstrap.php';

use SchematicCount\Importer;
use SchematicCount\ImportException;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): never
{
    if (isset($body['code']) && !isset($body['params'])) {
        $body['params'] = new stdClass();
    }
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$config = require dirname(__DIR__) . '/config.php';
@ini_set('memory_limit', $config['memory_limit']);
@set_time_limit($config['time_limit']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'code' => 'method']);
}

$file = $_FILES['file'] ?? null;
if (!is_array($file) || !isset($file['error'])) {
    // post_max_size estourado faz $_FILES vir vazio
    $len = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    respond(400, ['ok' => false, 'code' => $len > 0 ? 'server_limit' : 'no_file']);
}

$uploadErrors = [
    UPLOAD_ERR_INI_SIZE   => 'server_limit',
    UPLOAD_ERR_FORM_SIZE  => 'file_too_big',
    UPLOAD_ERR_PARTIAL    => 'upload_partial',
    UPLOAD_ERR_NO_FILE    => 'no_file',
    UPLOAD_ERR_NO_TMP_DIR => 'server_storage',
    UPLOAD_ERR_CANT_WRITE => 'server_storage',
];
if ($file['error'] !== UPLOAD_ERR_OK) {
    respond(400, ['ok' => false, 'code' => $uploadErrors[$file['error']] ?? 'upload_failed']);
}
if ($file['size'] > $config['max_upload_bytes']) {
    respond(413, ['ok' => false, 'code' => 'file_too_big_mb', 'params' => ['mb' => intdiv($config['max_upload_bytes'], 1048576)]]);
}
if (!is_uploaded_file($file['tmp_name'])) {
    respond(400, ['ok' => false, 'code' => 'upload_failed']);
}

$fileName = (string) ($file['name'] ?? 'schematic');
$ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
if (!in_array($ext, ['litematic', 'schem', 'schematic', 'nbt', 'json'], true)) {
    respond(415, ['ok' => false, 'code' => 'ext_unsupported']);
}

$started = microtime(true);
try {
    $bytes = file_get_contents($file['tmp_name']);
    $importer = new Importer($config);
    $project = $importer->import($bytes, $fileName);
    $project['source']['processingMs'] = (int) round((microtime(true) - $started) * 1000);
    respond(200, ['ok' => true, 'project' => $project]);
} catch (ImportException $e) {
    respond(422, ['ok' => false, 'code' => $e->key, 'params' => (object) $e->params]);
} catch (\Throwable $e) {
    error_log('[SchematicCount] ' . $e);
    respond(500, ['ok' => false, 'code' => 'internal']);
}
