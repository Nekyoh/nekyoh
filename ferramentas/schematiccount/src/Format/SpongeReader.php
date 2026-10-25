<?php

namespace SchematicCount\Format;

use SchematicCount\BlockTally;
use SchematicCount\ImportException;
use SchematicCount\Nbt\NbtArray;

/**
 * .schem — Sponge Schematic v1, v2 e v3 (WorldEdit 7+, FAWE, Amulet, etc.)
 *
 *  v1/v2: raiz { Version, Width, Height, Length, Palette{estado:indice}, BlockData: varint[] }
 *  v3:    raiz { Schematic: { Version:3, Width, Height, Length, Blocks{ Palette, Data } } }
 */
final class SpongeReader
{
    public static function matches(array $root): bool
    {
        $r = self::unwrap($root);
        return (isset($r['Palette'], $r['BlockData']))
            || (isset($r['Blocks']) && is_array($r['Blocks']) && isset($r['Blocks']['Palette']));
    }

    private static function unwrap(array $root): array
    {
        return (isset($root['Schematic']) && is_array($root['Schematic'])) ? $root['Schematic'] : $root;
    }

    public static function read(array $root, BlockTally $tally, int $maxVolume): array
    {
        $r = self::unwrap($root);
        $version = (int) ($r['Version'] ?? 0);

        if (isset($r['Blocks']) && is_array($r['Blocks'])) {
            $palette = $r['Blocks']['Palette'] ?? null;
            $data    = $r['Blocks']['Data'] ?? null;
            $version = max($version, 3);
        } else {
            $palette = $r['Palette'] ?? null;
            $data    = $r['BlockData'] ?? null;
        }

        if (!is_array($palette) || !$data instanceof NbtArray) {
            throw new ImportException('sponge_no_palette');
        }

        $w = ((int) ($r['Width'] ?? 0)) & 0xFFFF;
        $h = ((int) ($r['Height'] ?? 0)) & 0xFFFF;
        $l = ((int) ($r['Length'] ?? 0)) & 0xFFFF;
        $volume = $w * $h * $l;
        if ($volume <= 0) {
            throw new ImportException('invalid_size');
        }
        if ($volume > $maxVolume) {
            throw new ImportException('too_big_volume', ['n' => $volume, 'max' => $maxVolume]);
        }

        // indice -> estado
        $byIndex = [];
        $maxIdx = 0;
        foreach ($palette as $state => $idx) {
            $idx = (int) $idx;
            $byIndex[$idx] = (string) $state;
            $maxIdx = max($maxIdx, $idx);
        }

        $counts = self::countVarInts($data->raw, $maxIdx, $volume);
        $warnings = [];
        if ($counts['__decoded'] !== $volume) {
            $warnings[] = ['key' => 'sponge_count_mismatch', 'params' => ['declared' => $volume, 'found' => $counts['__decoded']]];
        }
        unset($counts['__decoded']);

        $unknown = 0;
        foreach ($counts as $idx => $n) {
            if (!isset($byIndex[$idx])) {
                $unknown += $n;
                continue;
            }
            $tally->addStateString($byIndex[$idx], $n);
        }
        if ($unknown) {
            $warnings[] = ['key' => 'out_of_palette', 'params' => ['n' => $unknown]];
        }

        $meta = is_array($r['Metadata'] ?? null) ? $r['Metadata'] : [];

        return [
            'format'      => 'schem',
            'version'     => $version,
            'name'        => is_string($meta['Name'] ?? null) ? $meta['Name'] : null,
            'author'      => is_string($meta['Author'] ?? null) ? $meta['Author'] : null,
            'description' => null,
            'dataVersion' => isset($r['DataVersion']) ? (int) $r['DataVersion'] : null,
            'size'        => [$w, $h, $l],
            'regions'     => [['name' => 'main', 'size' => [$w, $h, $l]]],
            'warnings'    => $warnings,
        ];
    }

    /** Conta índices em um array de varints. */
    private static function countVarInts(string $raw, int $maxIdx, int $volume): array
    {
        $len = strlen($raw);

        // Caminho rápido: paleta < 128 => cada varint é exatamente 1 byte
        if ($maxIdx < 128) {
            $raw = $len > $volume ? substr($raw, 0, $volume) : $raw;
            $counts = count_chars($raw, 1);
            $counts['__decoded'] = min($len, $volume);
            return $counts;
        }

        $counts = [];
        $decoded = 0;
        $i = 0;
        while ($i < $len && $decoded < $volume) {
            $value = 0;
            $shift = 0;
            do {
                $b = ord($raw[$i++]);
                $value |= ($b & 0x7F) << $shift;
                $shift += 7;
            } while (($b & 0x80) && $i < $len && $shift < 35);
            $counts[$value] = ($counts[$value] ?? 0) + 1;
            $decoded++;
        }
        $counts['__decoded'] = $decoded;
        return $counts;
    }
}
