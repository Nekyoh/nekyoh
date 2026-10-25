<?php
/**
 * Gera as tabelas em /data a partir do repositório PrismarineJS/minecraft-data.
 *
 * Uso (CLI):
 *   git clone --depth 1 https://github.com/PrismarineJS/minecraft-data
 *   git clone --depth 1 --branch assets-json https://github.com/misode/mcmeta
 *   php tools/generate-data.php minecraft-data/data/pc 26.1 mcmeta/assets/minecraft/lang
 *
 * Argumentos:
 *   1) caminho para a pasta data/pc do minecraft-data
 *   2) versão "moderna" a usar (pasta dentro de data/pc), ex.: 26.1
 *   3) pasta com os arquivos de idioma oficiais do jogo (pt_br.json, en_us.json, es_es.json)
 *   4) (opcional) versão legada para nomes numéricos, padrão 1.12
 *
 * Rode de novo sempre que sair uma versão nova do Minecraft com blocos novos.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$base    = rtrim($argv[1] ?? '', '/');
$version = $argv[2] ?? '26.1';
$langDir = rtrim($argv[3] ?? '', '/');
$legacyV = $argv[4] ?? '1.12';

if ($base === '' || !is_dir("$base/$version") || !is_file("$langDir/pt_br.json")) {
    fwrite(STDERR, "Uso: php tools/generate-data.php <minecraft-data/data/pc> <versao> <pasta-lang> [versao-legada]\n");
    exit(1);
}

function readJson(string $file): array
{
    $data = json_decode(file_get_contents($file), true);
    if (!is_array($data)) {
        fwrite(STDERR, "JSON inválido: $file\n");
        exit(1);
    }
    return $data;
}

$blocksJson = readJson("$base/$version/blocks.json");
$itemsJson  = readJson("$base/$version/items.json");
$legacyJson = readJson("$base/common/legacy.json");
$oldBlocks  = readJson("$base/$legacyV/blocks.json");
$langs = [
    'pt' => readJson("$langDir/pt_br.json"),
    'en' => readJson("$langDir/en_us.json"),
    'es' => readJson("$langDir/es_es.json"),
];

// ------------------------------------------------------------------
// Itens: tamanho do stack + nome oficial do jogo em pt / en / es
// ------------------------------------------------------------------
// O Litematica conta o caldeirão com nível 1/2 como "Potion" de água
$langKeyOverride = ['potion' => 'item.minecraft.potion.effect.water'];

$items = [];
$missing = 0;
foreach ($itemsJson as $it) {
    $n = $it['name'];
    $keys = isset($langKeyOverride[$n])
        ? [$langKeyOverride[$n]]
        : ["item.minecraft.$n", "block.minecraft.$n"];
    $names = [];
    foreach ($langs as $code => $dict) {
        foreach ($keys as $k) {
            if (isset($dict[$k]) && is_string($dict[$k])) {
                $names[$code] = $dict[$k];
                break;
            }
        }
        if (!isset($names[$code])) {
            $names[$code] = $names['en'] ?? $it['displayName'];
            $missing++;
        }
    }
    $items['minecraft:' . $n] = ['stack' => (int) $it['stackSize'], 'names' => $names];
}
ksort($items);
if ($missing) {
    fwrite(STDERR, "Aviso: $missing nomes sem tradução (usado o nome em inglês)\n");
}

// ------------------------------------------------------------------
// Bloco -> item (equivalente ao Block.asItem() do jogo)
//
// Por padrão o item tem o mesmo id do bloco. As exceções abaixo são os
// blocos cujo item tem outro nome (ItemNameBlockItem / StandingAndWallBlockItem).
// Blocos sem item nenhum vão para a lista "none" (o Litematica ignora).
// ------------------------------------------------------------------
$explicit = [
    'wheat'            => 'wheat_seeds',   // o item "wheat" existe, mas não é o item do bloco
    'carrots'          => 'carrot',
    'potatoes'         => 'potato',
    'beetroots'        => 'beetroot_seeds',
    'torchflower_crop' => 'torchflower_seeds',
    'pitcher_crop'     => 'pitcher_pod',
    'cocoa'            => 'cocoa_beans',
    'pumpkin_stem'     => 'pumpkin_seeds',
    'melon_stem'       => 'melon_seeds',
    'redstone_wire'    => 'redstone',
    'tripwire'         => 'string',
    'sweet_berry_bush' => 'sweet_berries',
    'cave_vines'       => 'glow_berries',
    'powder_snow'      => 'powder_snow_bucket',
    'wall_torch'       => 'torch',
];

// Tratados à parte pelo MaterialResolver (fluidos, vasos, caldeirões)
$special = ['water', 'lava', 'water_cauldron', 'lava_cauldron', 'powder_snow_cauldron'];

$blockToItem = [];
$noItem      = [];

foreach ($blocksJson as $b) {
    $name = $b['name'];

    if (isset($explicit[$name])) {
        $blockToItem['minecraft:' . $name] = 'minecraft:' . $explicit[$name];
        continue;
    }
    if (isset($items['minecraft:' . $name]) || in_array($name, $special, true) || str_starts_with($name, 'potted_')) {
        continue;
    }
    // Variantes de parede: oak_wall_sign -> oak_sign, tube_coral_wall_fan -> tube_coral_fan ...
    if (str_contains($name, '_wall_')) {
        $candidate = str_replace('_wall_', '_', $name);
        if (isset($items['minecraft:' . $candidate])) {
            $blockToItem['minecraft:' . $name] = 'minecraft:' . $candidate;
            continue;
        }
    }
    $noItem[] = 'minecraft:' . $name;
}
ksort($blockToItem);
sort($noItem);

// Itens de vasos: potted_X -> X (com exceções)
$pottedMap = [];
foreach ($blocksJson as $b) {
    if (!str_starts_with($b['name'], 'potted_')) {
        continue;
    }
    $plant = substr($b['name'], 7);
    $plant = ['azalea_bush' => 'azalea', 'flowering_azalea_bush' => 'flowering_azalea'][$plant] ?? $plant;
    if (!isset($items['minecraft:' . $plant])) {
        fwrite(STDERR, "Aviso: planta do vaso sem item: {$b['name']}\n");
    }
    $pottedMap['minecraft:' . $b['name']] = 'minecraft:' . $plant;
}
ksort($pottedMap);

// ------------------------------------------------------------------
// Dados legados (.schematic antigo, IDs numéricos)
// ------------------------------------------------------------------
$legacyStates = [];
foreach ($legacyJson['blocks'] as $key => $state) {
    $legacyStates[$key] = $state;
}
$legacyNames = [];
foreach ($oldBlocks as $b) {
    $legacyNames['minecraft:' . $b['name']] = (int) $b['id'];
}

// ------------------------------------------------------------------
// Escrita
// ------------------------------------------------------------------
$outDir = dirname(__DIR__) . '/data';
$header = "<?php\n// Gerado por tools/generate-data.php a partir do minecraft-data ($version). Não edite à mão.\n";

file_put_contents("$outDir/items.php", $header . 'return ' . var_export($items, true) . ";\n");
file_put_contents("$outDir/blocks.php", $header . 'return ' . var_export([
    'version'  => $version,
    'toItem'   => $blockToItem,
    'noItem'   => array_fill_keys($noItem, true),
    'potted'   => $pottedMap,
], true) . ";\n");
file_put_contents("$outDir/legacy.php", $header . 'return ' . var_export([
    'states' => $legacyStates,
    'names'  => $legacyNames,
], true) . ";\n");

printf("Itens: %d | exceções bloco->item: %d | blocos sem item: %d | vasos: %d | legado: %d estados\n",
    count($items), count($blockToItem), count($noItem), count($pottedMap), count($legacyStates));
echo "Sem item: " . implode(', ', array_map(fn($n) => substr($n, 10), $noItem)) . "\n";
