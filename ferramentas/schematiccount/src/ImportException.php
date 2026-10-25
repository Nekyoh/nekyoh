<?php

namespace SchematicCount;

/**
 * Erro "esperado" de importação.
 *
 * Não carrega texto em nenhum idioma: só um código (ex.: "file_too_big") e parâmetros.
 * O navegador traduz usando lang/*.json, então a mesma resposta serve para pt, en e es.
 */
final class ImportException extends \RuntimeException
{
    public function __construct(
        public readonly string $key,
        public readonly array $params = []
    ) {
        parent::__construct($key);
    }
}
