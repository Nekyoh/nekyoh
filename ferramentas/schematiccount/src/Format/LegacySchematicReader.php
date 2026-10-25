<?php

namespace SchematicCount\Format;

use SchematicCount\BlockTally;
use SchematicCount\ImportException;
use SchematicCount\Nbt\NbtArray;

/**
 * .schematic antigo (MCEdit / Schematica / WorldEdit 6, Minecraft <= 1.12)
 *
 *   Width, Height, Length, Blocks (byte[]), Data (byte[]), AddBlocks (nibbles, opcional)
 *   SchematicaMapping { "minecraft:wool": 35, ... }  (Schematica)
 *   BlockIDs { "35": "minecraft:wool", ... }          (MCEdit 2)
 *
 * IDs numéricos + metadata são convertidos para block states modernos com a tabela
 * de "flattening" (data/legacy.php), e daí seguem o mesmo caminho dos outros formatos.
 */
final class LegacySchematicReader
{
    public static function matches(array $root): bool
    {
        return isset($root['Blocks'], $root['Data']) && $root['Blocks'] instanceof NbtArray;
    }

    public static function read(array $root, BlockTally $tally, int $maxVolume, array $legacy): array
    {
        $w = ((int) ($root['Width'] ?? 0)) & 0xFFFF;
        $h = ((int) ($root['Height'] ?? 0)) & 0xFFFF;
        $l = ((int) ($root['Length'] ?? 0)) & 0xFFFF;
        $volume = $w * $h * $l;

        if ($volume <= 0) {
            throw new ImportException('invalid_size');
        }
        if ($volume > $maxVolume) {
            throw new ImportException('too_big_volume', ['n' => $volume, 'max' => $maxVolume]);
        }
        if (isset($root['Add']) && !isset($root['AddBlocks'])) {
            throw new ImportException('schematica_add_unsupported');
        }

        /** @var NbtArray $blocks */
        $blocks = $root['Blocks'];
        $data = $root['Data'] instanceof NbtArray ? $root['Data']->raw : '';
        $add = (isset($root['AddBlocks']) && $root['AddBlocks'] instanceof NbtArray) ? $root['AddBlocks']->raw : '';

        $raw = $blocks->raw;
        $n = min($volume, strlen($raw));
        $dataLen = strlen($data);
        $addLen = strlen($add);

        // chave = (id << 4) | meta
        $counts = [];
        if ($addLen === 0) {
            for ($i = 0; $i < $n; $i++) {
                $k = (ord($raw[$i]) << 4) | ($i < $dataLen ? (ord($data[$i]) & 0x0F) : 0);
                $counts[$k] = ($counts[$k] ?? 0) + 1;
            }
        } else {
            // Mesmo layout que o Litematica lê/escreve: índice par = nibble alto, ímpar = nibble baixo
            for ($i = 0; $i < $n; $i++) {
                $a = ($i >> 1) < $addLen ? ord($add[$i >> 1]) : 0;
                $hi = ($i & 1) === 0 ? ($a & 0xF0) >> 4 : ($a & 0x0F);
                $id = ($hi << 8) | ord($raw[$i]);
                $k = ($id << 4) | ($i < $dataLen ? (ord($data[$i]) & 0x0F) : 0);
                $counts[$k] = ($counts[$k] ?? 0) + 1;
            }
        }

        // Paleta própria do arquivo (id local -> nome antigo)
        $localNames = null;
        if (isset($root['SchematicaMapping']) && is_array($root['SchematicaMapping'])) {
            $localNames = [];
            foreach ($root['SchematicaMapping'] as $name => $id) {
                $localNames[(int) $id] = BlockTally::normalizeName((string) $name);
            }
        } elseif (isset($root['BlockIDs']) && is_array($root['BlockIDs'])) {
            $localNames = [];
            foreach ($root['BlockIDs'] as $id => $name) {
                $localNames[(int) $id] = BlockTally::normalizeName((string) $name);
            }
        }

        $warnings = [];
        $unknown = [];
        foreach ($counts as $k => $cnt) {
            $id = $k >> 4;
            $meta = $k & 0x0F;

            $vanillaId = $id;
            if ($localNames !== null) {
                $name = $localNames[$id] ?? null;
                if ($name === null) {
                    if ($id !== 0) {
                        $unknown["#$id"] = ($unknown["#$id"] ?? 0) + $cnt;
                    }
                    continue;
                }
                if (!isset($legacy['names'][$name])) {
                    // Bloco de mod / desconhecido: usa o nome como está
                    $tally->add($name, [], $cnt);
                    continue;
                }
                $vanillaId = $legacy['names'][$name];
            }

            $state = $legacy['states']["$vanillaId:$meta"] ?? $legacy['states']["$vanillaId:0"] ?? null;
            if ($state === null) {
                $unknown["#$vanillaId:$meta"] = ($unknown["#$vanillaId:$meta"] ?? 0) + $cnt;
                continue;
            }
            $tally->addStateString($state, $cnt);
        }

        if ($unknown) {
            $list = [];
            foreach (array_slice($unknown, 0, 8, true) as $what => $c) {
                $list[] = "$what ($c)";
            }
            $warnings[] = ['key' => 'legacy_unknown', 'params' => ['list' => implode(', ', $list) . (count($unknown) > 8 ? '…' : '')]];
        }

        return [
            'format'      => 'schematic',
            'variant'     => isset($root['SchematicaMapping']) ? 'schematica' : 'mcedit',
            'name'        => null,
            'author'      => null,
            'description' => null,
            'dataVersion' => null,
            'size'        => [$w, $h, $l],
            'regions'     => [['name' => 'main', 'size' => [$w, $h, $l]]],
            'warnings'    => $warnings,
        ];
    }
}
