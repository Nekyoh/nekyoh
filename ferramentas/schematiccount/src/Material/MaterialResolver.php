<?php

namespace SchematicCount\Material;

/**
 * Converte block states em itens exatamente como a Material List do Litematica.
 *
 * Porta de:
 *   fi.dy.masa.litematica.materials.MaterialCache
 *     - getStateToItemOverride()   (fluidos, metades superiores, cabeceira da cama, etc.)
 *     - overrideStackSize()        (lajes duplas, camadas de neve, velas, picles, ovos, líquen)
 *     - requiresMultipleItems() / getItems()  (vasos com planta, caldeirões cheios)
 *   fi.dy.masa.litematica.materials.MaterialListUtils.convertStatesToStacks()
 *     - blocos com waterlogged=true somam 1 balde de água
 *
 * Para o resto vale Block.asItem(): o item com o mesmo id do bloco, salvo as exceções
 * geradas em data/blocks.php (cenoura, trigo, tochas de parede...) e os blocos que
 * não têm item nenhum (fogo, portal, kelp_plant...), que o Litematica não lista.
 */
final class MaterialResolver
{
    /** Nomes antigos que o DataFixer do jogo renomeia ao carregar schematics velhos. */
    private const RENAMES = [
        'minecraft:grass'      => 'minecraft:short_grass',
        'minecraft:grass_path' => 'minecraft:dirt_path',
        'minecraft:sign'       => 'minecraft:oak_sign',
        'minecraft:wall_sign'  => 'minecraft:oak_wall_sign',
        'minecraft:chain'      => 'minecraft:iron_chain',
    ];

    /** Blocos que o Litematica força para "nenhum item". */
    private const NEVER = [
        'minecraft:piston_head'   => true,
        'minecraft:moving_piston' => true,
        'minecraft:nether_portal' => true,
        'minecraft:end_portal'    => true,
        'minecraft:end_gateway'   => true,
    ];

    /** MultifaceSpreadeableBlock: conta 1 item por face ocupada. */
    private const MULTIFACE = [
        'minecraft:glow_lichen' => true,
        'minecraft:sculk_vein'  => true,
    ];

    private const FACES = ['north', 'south', 'east', 'west', 'up', 'down'];

    private array $toItem;
    private array $noItem;
    private array $potted;
    private array $items;

    /** @var array<string, array<string,int>> cache por estado */
    private array $cache = [];

    /** Blocos que não estão nas tabelas (versão mais nova do jogo ou mods). */
    public array $unknownBlocks = [];

    public function __construct(array $blocksData, array $itemsData)
    {
        $this->toItem = $blocksData['toItem'];
        $this->noItem = $blocksData['noItem'];
        $this->potted = $blocksData['potted'];
        $this->items  = $itemsData;
    }

    /**
     * @return array<string,int> itens necessários para UM bloco neste estado
     */
    public function resolve(string $name, array $props): array
    {
        $key = $name . json_encode($props);
        if (isset($this->cache[$key])) {
            return $this->cache[$key];
        }

        $name = self::RENAMES[$name] ?? $name;

        // Caldeirão de versões antigas: cauldron[level=N] virou water_cauldron
        if ($name === 'minecraft:cauldron' && (int) ($props['level'] ?? 0) > 0) {
            $name = 'minecraft:water_cauldron';
        }

        $out = [];

        // MaterialListUtils: bloco com água => +1 balde, e o resto é calculado sem a água
        if (($props['waterlogged'] ?? '') === 'true') {
            $out['minecraft:water_bucket'] = 1;
        }

        foreach ($this->itemsForState($name, $props) as $item => $qty) {
            if ($qty > 0) {
                $out[$item] = ($out[$item] ?? 0) + $qty;
            }
        }

        return $this->cache[$key] = $out;
    }

    private function itemsForState(string $name, array $props): array
    {
        // ---------- requiresMultipleItems() / getItems() ----------
        if (isset($this->potted[$name]) || (str_starts_with($name, 'minecraft:potted_'))) {
            $plant = $this->potted[$name] ?? 'minecraft:' . substr($name, strlen('minecraft:potted_'));
            return ['minecraft:flower_pot' => 1, $plant => 1];
        }
        switch ($name) {
            case 'minecraft:lava_cauldron':
                return ['minecraft:cauldron' => 1, 'minecraft:lava_bucket' => 1];
            case 'minecraft:powder_snow_cauldron':
                return ['minecraft:cauldron' => 1, 'minecraft:powder_snow_bucket' => 1];
            case 'minecraft:water_cauldron':
                return match ((int) ($props['level'] ?? 3)) {
                    1       => ['minecraft:cauldron' => 1, 'minecraft:potion' => 1],
                    2       => ['minecraft:cauldron' => 1, 'minecraft:potion' => 2],
                    3       => ['minecraft:cauldron' => 1, 'minecraft:water_bucket' => 1],
                    default => ['minecraft:cauldron' => 1],
                };
        }

        // ---------- getStateToItemOverride() ----------
        if (isset(self::NEVER[$name])) {
            return [];
        }
        if ($name === 'minecraft:water' || $name === 'minecraft:lava') {
            // Só a fonte (level=0) custa um balde
            if ((int) ($props['level'] ?? 0) !== 0) {
                return [];
            }
            return [$name === 'minecraft:water' ? 'minecraft:water_bucket' : 'minecraft:lava_bucket' => 1];
        }
        if ($name === 'minecraft:farmland') {
            return ['minecraft:dirt' => 1];
        }
        // Portas e plantas altas (DoubleBlockHalf): só a metade de baixo conta
        if (($props['half'] ?? '') === 'upper') {
            return [];
        }
        // Camas: só o pé conta
        if (($props['part'] ?? '') === 'head' && str_ends_with($name, '_bed')) {
            return [];
        }

        // ---------- Block.asItem() ----------
        $item = $this->asItem($name);
        if ($item === null) {
            return [];
        }

        // ---------- overrideStackSize() ----------
        $count = 1;
        if (($props['type'] ?? '') === 'double' && str_ends_with($name, '_slab')) {
            $count = 2;
        } elseif ($name === 'minecraft:snow') {
            $count = (int) ($props['layers'] ?? 1);
        } elseif ($name === 'minecraft:turtle_egg') {
            $count = (int) ($props['eggs'] ?? 1);
        } elseif ($name === 'minecraft:sea_pickle') {
            $count = (int) ($props['pickles'] ?? 1);
        } elseif (str_ends_with($name, 'candle') && isset($props['candles'])) {
            $count = (int) $props['candles'];
        } elseif (isset(self::MULTIFACE[$name])) {
            $count = 0;
            foreach (self::FACES as $f) {
                if (($props[$f] ?? '') === 'true') {
                    $count++;
                }
            }
        }

        return [$item => $count];
    }

    private function asItem(string $name): ?string
    {
        if ($name === 'minecraft:air' || $name === 'minecraft:cave_air' || $name === 'minecraft:void_air') {
            return null; // Items.AIR = ItemStack vazio
        }
        if (isset($this->toItem[$name])) {
            return $this->toItem[$name];
        }
        if (isset($this->noItem[$name])) {
            return null;
        }
        if (isset($this->items[$name])) {
            return $name;
        }

        // Bloco que não está nas tabelas (Minecraft mais novo que os dados, ou mod)
        if (str_contains($name, '_wall_')) {
            $candidate = str_replace('_wall_', '_', $name);
            if (isset($this->items[$candidate])) {
                return $candidate;
            }
        }
        $this->unknownBlocks[$name] = true;
        return $name;
    }
}
