<?php
/**
 * Autoload do SchematicCount.
 * Funciona sem Composer; se você rodar "composer install", o vendor/autoload.php
 * também é carregado (útil se no futuro adicionar dependências).
 */

$vendor = dirname(__DIR__) . '/vendor/autoload.php';
if (is_file($vendor)) {
    require_once $vendor;
}

spl_autoload_register(static function (string $class): void {
    $prefix = 'SchematicCount\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (is_file($file)) {
        require $file;
    }
});
