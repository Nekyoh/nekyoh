<?php

namespace SchematicCount;

use SchematicCount\Format\LegacySchematicReader;
use SchematicCount\Format\LitematicReader;
use SchematicCount\Format\SpongeReader;
use SchematicCount\Format\StructureReader;
use SchematicCount\Material\MaterialResolver;
use SchematicCount\Nbt\NbtReader;

/**
 * Ponto de entrada: recebe o conteúdo de um arquivo e devolve a lista de materiais.
 */
final class Importer
{
    private array $config;
    private ?array $items = null;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /** Decide pelo conteúdo (não pela extensão) se é JSON ou NBT. */
    public function import(string $bytes, string $fileName): array
    {
        $trim = ltrim(substr($bytes, 0, 64));
        if ($trim !== '' && ($trim[0] === '{' || $trim[0] === '[')) {
            return $this->importJson($bytes, $fileName);
        }
        return $this->importSchematic($bytes, $fileName);
    }

    // ------------------------------------------------------------------
    // Arquivo bruto (.litematic / .schem / .schematic / .nbt)
    // ------------------------------------------------------------------
    public function importSchematic(string $bytes, string $fileName): array
    {
        $root = NbtReader::parse($bytes, $this->config['max_nbt_bytes']);
        unset($bytes);

        $tally = new BlockTally();
        $maxVolume = $this->config['max_volume'];

        if (LitematicReader::matches($root)) {
            $meta = LitematicReader::read($root, $tally, $maxVolume);
        } elseif (SpongeReader::matches($root)) {
            $meta = SpongeReader::read($root, $tally, $maxVolume);
        } elseif (LegacySchematicReader::matches($root)) {
            $meta = LegacySchematicReader::read($root, $tally, $maxVolume, $this->data('legacy'));
        } elseif (StructureReader::matches($root)) {
            $meta = StructureReader::read($root, $tally, $maxVolume);
        } else {
            throw new ImportException('unknown_format');
        }
        unset($root);

        $resolver = new MaterialResolver($this->data('blocks'), $this->items());
        $totals = [];
        $blocks = 0;

        foreach ($tally->all() as $state) {
            $needed = $resolver->resolve($state['name'], $state['props']);
            if ($needed) {
                $blocks += $state['count'];
            }
            foreach ($needed as $item => $qty) {
                $totals[$item] = ($totals[$item] ?? 0) + $qty * $state['count'];
            }
        }

        if (!$totals) {
            throw new ImportException('no_materials');
        }

        $warnings = $meta['warnings'];
        if ($resolver->unknownBlocks) {
            $names = array_keys($resolver->unknownBlocks);
            $warnings[] = ['key' => 'unknown_blocks', 'params' => [
                'list' => implode(', ', array_slice($names, 0, 10)) . (count($names) > 10 ? '…' : ''),
            ]];
        }

        unset($meta['warnings']);
        $meta['fileName'] = $fileName;

        return $this->result($meta['name'] ?: self::baseName($fileName), $totals, $meta, $warnings, $blocks);
    }

    // ------------------------------------------------------------------
    // JSON exportado pelo Litematica (Material List -> Export JSON)
    // ou backup exportado por este site
    // ------------------------------------------------------------------
    public function importJson(string $bytes, string $fileName): array
    {
        if (strlen($bytes) > $this->config['max_upload_bytes']) {
            throw new ImportException('file_too_big');
        }
        // remove BOM
        if (str_starts_with($bytes, "\xEF\xBB\xBF")) {
            $bytes = substr($bytes, 3);
        }
        $data = json_decode($bytes, true, 64);
        if (!is_array($data)) {
            throw new ImportException('json_invalid', ['detail' => json_last_error_msg()]);
        }

        $list = $data['Materials'] ?? $data['materials'] ?? (array_is_list($data) ? $data : null);
        if (!is_array($list) || !$list) {
            throw new ImportException('json_no_materials');
        }

        $multiplier = max(1, (int) ($data['Multiplier'] ?? 1));
        $totals = [];
        $skipped = 0;
        foreach ($list as $row) {
            if (!is_array($row)) {
                $skipped++;
                continue;
            }
            $id = $row['Item'] ?? $row['item'] ?? $row['id'] ?? null;
            if (is_array($id)) {
                $id = $id['id'] ?? $id['Name'] ?? null;
            }
            $total = $row['Total'] ?? $row['total'] ?? $row['count'] ?? null;
            if (!is_string($id) || $id === '' || !is_numeric($total) || (int) $total <= 0) {
                $skipped++;
                continue;
            }
            $id = BlockTally::normalizeName($id);
            $totals[$id] = ($totals[$id] ?? 0) + (int) $total;
        }

        if (!$totals) {
            throw new ImportException('json_no_items');
        }

        $warnings = $skipped ? [['key' => 'json_skipped', 'params' => ['n' => $skipped]]] : [];
        $title = $data['Name'] ?? $data['name'] ?? null;
        if (is_string($title) && str_starts_with($title, 'litematica.')) {
            $title = null; // chave de tradução, não é nome de verdade
        }

        $meta = [
            'format'      => 'json',
            'multiplier'  => $multiplier,
            'fileName'    => $fileName,
            'name'        => is_string($title) && $title !== '' ? $title : null,
            'author'      => null,
            'description' => null,
            'dataVersion' => null,
            'size'        => null,
            'regions'     => [],
            'exportedAt'  => is_string($data['Date'] ?? null) ? $data['Date'] : null,
        ];

        // Backup exportado por este site: traz também o progresso de coleta
        $collected = $data['SchematicCount']['collected'] ?? null;
        $got = [];
        if (is_array($collected)) {
            foreach ($collected as $id => $n) {
                if (is_numeric($n)) {
                    $got[BlockTally::normalizeName((string) $id)] = max(0, (int) $n);
                }
            }
            $meta['format'] = 'backup';
        }

        return $this->result($meta['name'] ?: self::baseName($fileName), $totals, $meta, $warnings, null, $got);
    }

    // ------------------------------------------------------------------

    private function result(string $name, array $totals, array $meta, array $warnings, ?int $blocks, array $got = []): array
    {
        $items = $this->items();
        $materials = [];
        foreach ($totals as $id => $total) {
            $info = $items[$id] ?? null;
            $pretty = self::prettyName($id);
            $materials[] = [
                'id'    => $id,
                'name'  => $info['names']['en'] ?? $pretty,
                // nome oficial do jogo em cada idioma (pt_br, en_us, es_es)
                'names' => $info['names'] ?? ['pt' => $pretty, 'en' => $pretty, 'es' => $pretty],
                'total' => $total,
                'stack' => $info['stack'] ?? 64,
                'got'   => min($total, $got[$id] ?? 0),
            ];
        }
        usort($materials, fn($a, $b) => $b['total'] <=> $a['total'] ?: strcmp($a['name'], $b['name']));

        return [
            'name'      => $name,
            'source'    => $meta,
            'materials' => $materials,
            'stats'     => [
                'types'  => count($materials),
                'items'  => array_sum($totals),
                'blocks' => $blocks,
            ],
            'warnings'  => array_values($warnings),
        ];
    }

    private function items(): array
    {
        return $this->items ??= $this->data('items');
    }

    private function data(string $name): array
    {
        return require dirname(__DIR__) . "/data/$name.php";
    }

    private static function baseName(string $fileName): string
    {
        $base = preg_replace('/\.(litematic|schem|schematic|nbt|json)$/i', '', basename($fileName));
        return $base !== '' ? $base : 'Schematic';
    }

    public static function prettyName(string $id): string
    {
        $n = str_replace('_', ' ', preg_replace('/^[^:]+:/', '', $id));
        return ucwords($n);
    }
}
