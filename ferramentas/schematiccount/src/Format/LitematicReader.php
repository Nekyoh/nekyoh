<?php

namespace SchematicCount\Format;

use SchematicCount\BlockTally;
use SchematicCount\ImportException;
use SchematicCount\Nbt\NbtArray;

/**
 * .litematic (Litematica)
 *
 * Estrutura (ver LitematicaSchematic / LitematicaBlockStateContainer):
 *   Version, MinecraftDataVersion, Metadata{Name, Author, ...}
 *   Regions{ <nome>: { Size{x,y,z}, BlockStatePalette: [ {Name, Properties{}} ], BlockStates: long[] } }
 *
 * BlockStates é um LitematicaBitArray: cada posição usa
 *   bits = max(2, ceil(log2(tamanho_da_paleta)))
 * e os valores PODEM atravessar a fronteira entre dois longs.
 */
final class LitematicReader
{
    public static function matches(array $root): bool
    {
        return isset($root['Regions']) && is_array($root['Regions']);
    }

    public static function read(array $root, BlockTally $tally, int $maxVolume): array
    {
        $meta = is_array($root['Metadata'] ?? null) ? $root['Metadata'] : [];
        $regionsOut = [];
        $warnings = [];
        $volumeTotal = 0;

        foreach ($root['Regions'] as $regionName => $region) {
            if (!is_array($region)) {
                continue;
            }
            $palette = $region['BlockStatePalette'] ?? null;
            $states  = $region['BlockStates'] ?? null;
            $size    = $region['Size'] ?? null;

            if (!is_array($palette) || !$states instanceof NbtArray || !is_array($size)) {
                $warnings[] = ['key' => 'region_empty', 'params' => ['region' => (string) $regionName]];
                continue;
            }

            $sx = abs((int) ($size['x'] ?? 0));
            $sy = abs((int) ($size['y'] ?? 0));
            $sz = abs((int) ($size['z'] ?? 0));
            $volume = $sx * $sy * $sz;
            if ($volume <= 0 || count($palette) === 0) {
                continue;
            }
            $volumeTotal += $volume;
            if ($volumeTotal > $maxVolume) {
                throw new ImportException('too_big_volume', ['n' => $volumeTotal, 'max' => $maxVolume]);
            }

            $paletteSize = count($palette);
            $bits = max(2, self::bitLength($paletteSize - 1));

            $needLongs = intdiv($volume * $bits + 63, 64);
            if ($states->width !== NbtArray::LONG || $states->count < $needLongs) {
                throw new ImportException('region_corrupt', ['region' => (string) $regionName]);
            }

            $counts = self::countPacked($states, $bits, $volume);

            $invalid = 0;
            foreach ($counts as $idx => $n) {
                if ($n === 0) {
                    continue;
                }
                $entry = $palette[$idx] ?? null;
                if (!is_array($entry) || !isset($entry['Name']) || !is_string($entry['Name'])) {
                    $invalid += $n;
                    continue;
                }
                $props = [];
                if (isset($entry['Properties']) && is_array($entry['Properties'])) {
                    foreach ($entry['Properties'] as $k => $v) {
                        $props[(string) $k] = is_string($v) ? $v : (string) $v;
                    }
                }
                $tally->add($entry['Name'], $props, $n);
            }
            if ($invalid > 0) {
                $warnings[] = ['key' => 'region_out_of_palette', 'params' => ['region' => (string) $regionName, 'n' => $invalid]];
            }

            $regionsOut[] = ['name' => (string) $regionName, 'size' => [$sx, $sy, $sz]];
        }

        if (!$regionsOut) {
            throw new ImportException('no_regions');
        }

        $enc = $meta['EnclosingSize'] ?? null;

        // Quando o Litematica converte outro formato, ele grava o nome como
        // "arquivo (Converted Sponge)" / "(Converted Structure)" / "(Converted Schematic)"
        // (LitematicaSchematic.java e WorldUtils.java). Tiramos o sufixo do nome
        // e mostramos a origem no rótulo do formato.
        $name = is_string($meta['Name'] ?? null) ? trim($meta['Name']) : null;
        $convertedFrom = null;
        if ($name !== null && preg_match('/^(.*?)\s*\(Converted (Sponge|Structure|Schematic)\)$/i', $name, $m)) {
            $name = $m[1] !== '' ? $m[1] : null;
            $convertedFrom = strtolower($m[2]);
        }
        $desc = is_string($meta['Description'] ?? null) ? $meta['Description'] : '';
        if ($convertedFrom === null && preg_match('/^Converted (Sponge|Vanilla|Schematica|Litematic)/i', $desc, $m)) {
            $convertedFrom = strtolower($m[1]);
        }
        $convertedFrom = [
            'sponge'     => 'schem',
            'structure'  => 'nbt',
            'vanilla'    => 'nbt',
            'schematic'  => 'schematic',
            'schematica' => 'schematic',
        ][$convertedFrom] ?? null;

        return [
            'format'      => 'litematic',
            'version'     => (int) ($root['Version'] ?? 0),
            'convertedFrom' => $convertedFrom,
            'name'        => $name,
            'author'      => is_string($meta['Author'] ?? null) ? $meta['Author'] : null,
            'description' => is_string($meta['Description'] ?? null) ? $meta['Description'] : null,
            'dataVersion' => isset($root['MinecraftDataVersion']) ? (int) $root['MinecraftDataVersion'] : null,
            'size'        => is_array($enc) ? [abs((int) ($enc['x'] ?? 0)), abs((int) ($enc['y'] ?? 0)), abs((int) ($enc['z'] ?? 0))] : ($regionsOut[0]['size'] ?? null),
            'regions'     => $regionsOut,
            'warnings'    => $warnings,
        ];
    }

    /** Número de bits necessários para representar $n (equivale a 32 - numberOfLeadingZeros). */
    public static function bitLength(int $n): int
    {
        $bits = 0;
        while ($n > 0) {
            $bits++;
            $n >>= 1;
        }
        return $bits;
    }

    /**
     * Conta quantas vezes cada índice da paleta aparece no array empacotado.
     * Porta direta de LitematicaBitArray.getAt(), processando os longs em blocos
     * para não estourar a memória em schematics grandes.
     *
     * @return int[] contagem indexada pelo índice da paleta
     */
    public static function countPacked(NbtArray $longs, int $bits, int $volume): array
    {
        $mask = (1 << $bits) - 1;
        $counts = array_fill(0, $mask + 1, 0);

        // Máscaras para "shift lógico" (o >> do PHP é aritmético)
        $low = [0 => -1];
        for ($o = 1; $o < 64; $o++) {
            $low[$o] = $o === 1 ? PHP_INT_MAX : (1 << (64 - $o)) - 1;
        }

        $chunk = 4096;              // longs por bloco
        $totalLongs = intdiv($volume * $bits + 63, 64);

        for ($c = 0; $c < $totalLongs; $c += $chunk) {
            // primeiro e último índice cujo bit inicial cai neste bloco de longs
            $iStart = intdiv($c * 64 + $bits - 1, $bits);
            $iEnd   = min($volume, intdiv(($c + $chunk) * 64 + $bits - 1, $bits));
            if ($iStart >= $iEnd) {
                continue;
            }
            // +1 long de sobra para valores que atravessam o fim do bloco
            $L = $longs->longs($c, $chunk + 1);
            $L[] = 0;
            $bitBase = $c * 64;
            $s = $iStart * $bits - $bitBase;

            for ($i = $iStart; $i < $iEnd; $i++, $s += $bits) {
                $li  = $s >> 6;
                $off = $s & 63;
                if ($off + $bits <= 64) {
                    $counts[($L[$li] >> $off) & $mask]++;
                } else {
                    $counts[((($L[$li] >> $off) & $low[$off]) | ($L[$li + 1] << (64 - $off))) & $mask]++;
                }
            }
        }

        return $counts;
    }
}
