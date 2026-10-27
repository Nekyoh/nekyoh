<?php
/*
 * ============================================================
 *  NEKYOH — configuração
 *  Links, estados e canais ficam aqui.
 *  Os TEXTOS (nomes/descrições em cada idioma) ficam em lang/*.php
 * ============================================================
 */

$site = [
    'nome'    => 'Nekyoh',
    'dominio' => 'nekyoh.tech',
    'versao'  => '1.0',
    'autores' => ['Tekyoh', 'Nezoru'],
    'idiomas' => ['pt' => 'Português', 'en' => 'English', 'es' => 'Español'],
    'idioma_padrao' => 'en',   // usado quando o navegador não pede pt/en/es
];

/*
 *  Ferramentas
 *    id        -> chave dos textos em lang/*.php  (tool.<id>.name / tool.<id>.desc)
 *    url       -> caminho local ('ferramentas/xyz/') ou URL completo
 *    tipo      -> 'local' | 'externo' (externo abre em nova aba)
 *    estado    -> 'ativo' | 'beta' | 'breve'  ('breve' fica sem link)
 *    categoria -> 'mods' | 'construcao' | 'survival' | 'comandos' — ou uma lista, para aparecer em várias abas
 *                 (ex.: ['mods', 'construcao']). Textos das abas em lang/*.php -> cat.<id>
 *    item      -> id de item do Minecraft usado como ícone (ex: 'chest', 'nether_star')
 *    logo      -> (opcional) imagem própria no lugar do ícone, ex.: 'assets/img/projetos/logoMod.png'
 *    destaque  -> true = cartão grande (usado nos projetos: mod, launcher…)
 */
$ferramentas = [
    // ---- Projetos (mod, launcher, plugins…): cada um no seu próprio site
    ['id' => 'epiccraft', 'url' => 'https://epiccraft.nekyoh.tech', 'tipo' => 'externo', 'estado' => 'beta',
     'categoria' => ['mods', 'construcao'], 'item' => 'nether_star', 'logo' => 'assets/img/projetos/logoMod.png',
     'tags' => ['Mod'], 'destaque' => true],
    ['id' => 'nekylauncher', 'url' => 'https://launcher.nekyoh.tech', 'tipo' => 'externo', 'estado' => 'ativo',
     'categoria' => ['mods'], 'item' => 'grass_block', 'logo' => 'assets/img/projetos/icon-256.png',
     'tags' => ['Launcher'], 'destaque' => true],
    // próximos plugins: copie um bloco acima e troque id, url e logo

    // ---- Construção
    ['id' => 'schematiccount', 'url' => 'ferramentas/schematiccount/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'construcao', 'item' => 'writable_book', 'tags' => ['.litematic', '.schem', '.nbt']],
    ['id' => 'circulos', 'url' => 'ferramentas/circulos/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'construcao', 'item' => 'compass', 'tags' => ['○', '⬭', '●']],
    ['id' => 'paletas', 'url' => 'ferramentas/paletas/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'construcao', 'item' => 'white_concrete', 'tags' => ['Design']],

    // ---- Survival
    ['id' => 'coordenadas', 'url' => 'ferramentas/coordenadas/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'survival', 'item' => 'obsidian', 'tags' => ['÷ 8', '× 8']],
    ['id' => 'encantamentos', 'url' => 'ferramentas/encantamentos/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'survival', 'item' => 'experience_bottle', 'tags' => ['XP', 'Anvil']],
    ['id' => 'ticks', 'url' => 'ferramentas/ticks/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'survival', 'item' => 'clock', 'tags' => ['20 TPS', 'Redstone']],

    // ---- Comandos e servidor
    ['id' => 'motd', 'url' => 'ferramentas/motd/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'comandos', 'item' => 'bell', 'tags' => ['server.properties', '§']],
    ['id' => 'title', 'url' => 'ferramentas/title/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'comandos', 'item' => 'name_tag', 'tags' => ['/title']],
    ['id' => 'placas', 'url' => 'ferramentas/placas/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'comandos', 'item' => 'oak_sign', 'tags' => ['/setblock', '/give']],
    ['id' => 'give', 'url' => 'ferramentas/give/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'comandos', 'item' => 'command_block', 'tags' => ['/give']],
    ['id' => 'armorstand', 'url' => 'ferramentas/armor-stand/', 'tipo' => 'local', 'estado' => 'ativo',
     'categoria' => 'comandos', 'item' => 'armor_stand', 'tags' => ['/summon']],
];

$categorias = ['mods', 'construcao', 'survival', 'comandos'];

/*
 *  Canais do YouTube
 *    foto -> imagem da cabeça (96×96) em assets/img/cabecas/
 *    Descrição de cada canal: lang/*.php -> channel.<id>.desc
 */
$canais = [
    [
        'id'   => 'tekyoh',
        'nome' => 'Tekyoh',
        'url'  => 'https://www.youtube.com/@Tekyoh01',
        'foto' => 'assets/img/cabecas/tekyoh.png',
    ],
    [
        'id'   => 'nezoru',
        'nome' => 'Nezoru',
        'url'  => 'https://www.youtube.com/@Nezoru',
        'foto' => 'assets/img/cabecas/nezoru.png',
    ],
];

// Mods de referência (descrições em lang/*.php -> ref.<id>.desc)
$referencias = [
    ['id' => 'litematica', 'nome' => 'Litematica', 'url' => 'https://www.curseforge.com/minecraft/mc-mods/litematica', 'item' => 'spyglass'],
    ['id' => 'worldedit',  'nome' => 'WorldEdit',  'url' => 'https://enginehub.org/worldedit', 'item' => 'wooden_axe'],
    ['id' => 'schematica', 'nome' => 'Schematica', 'url' => 'https://www.curseforge.com/minecraft/mc-mods/schematica', 'item' => 'map'],
];
