<?php

namespace SchematicCount\Format;

use SchematicCount\BlockTally;
use SchematicCount\ImportException;

/**
 * .nbt — Structure Block do Minecraft vanilla
 *   size[3], palette[ {Name, Properties} ] (ou palettes[][]), blocks[ {pos, state} ]
 */
final class StructureReader
{
    public static function matches(array $root): bool
    {
        return isset($root['blocks']) && is_array($root['blocks'])
            && (isset($root['palette']) || isset($root['palettes']));
    }

    public static function read(array $root, BlockTally $tally, int $maxVolume): array
    {
        $palette = $root['palette'] ?? (is_array($root['palettes'] ?? null) ? ($root['palettes'][0] ?? []) : []);
        if (!is_array($palette) || !$palette) {
            throw new ImportException('structure_no_palette');
        }

        $size = is_array($root['size'] ?? null) ? array_map('intval', $root['size']) : [0, 0, 0];
        if (count($root['blocks']) > $maxVolume) {
            throw new ImportException('too_big_volume', ['n' => count($root['blocks']), 'max' => $maxVolume]);
        }

        $counts = [];
        foreach ($root['blocks'] as $b) {
            if (is_array($b) && isset($b['state'])) {
                $s = (int) $b['state'];
                $counts[$s] = ($counts[$s] ?? 0) + 1;
            }
        }

        $warnings = [];
        foreach ($counts as $idx => $n) {
            $entry = $palette[$idx] ?? null;
            if (!is_array($entry) || !is_string($entry['Name'] ?? null)) {
                $warnings[] = ['key' => 'out_of_palette', 'params' => ['n' => $n]];
                continue;
            }
            $props = [];
            foreach (($entry['Properties'] ?? []) as $k => $v) {
                $props[(string) $k] = (string) $v;
            }
            $tally->add($entry['Name'], $props, $n);
        }

        return [
            'format'      => 'nbt',
            'name'        => null,
            'author'      => is_string($root['author'] ?? null) ? $root['author'] : null,
            'description' => null,
            'dataVersion' => isset($root['DataVersion']) ? (int) $root['DataVersion'] : null,
            'size'        => array_slice(array_pad($size, 3, 0), 0, 3),
            'regions'     => [['name' => 'main', 'size' => array_slice(array_pad($size, 3, 0), 0, 3)]],
            'warnings'    => $warnings,
        ];
    }
}
