<?php
/**
 * Configurações do processamento no servidor.
 * Ajuste conforme a sua hospedagem (memória / tempo de execução).
 */
return [
    // Tamanho máximo do arquivo enviado (o php.ini também precisa permitir:
    // upload_max_filesize e post_max_size >= este valor)
    'max_upload_bytes' => 32 * 1024 * 1024,      // 32 MB

    // Tamanho máximo depois de descompactar o NBT
    'max_nbt_bytes'    => 512 * 1024 * 1024,     // 512 MB

    // Volume máximo somando todas as regiões (largura x altura x comprimento)
    'max_volume'       => 150_000_000,

    // Limites de execução aplicados no endpoint
    'memory_limit'     => '1024M',
    'time_limit'       => 180,                   // segundos
];
