# SchematicCount

Lista de materiais para construções do Minecraft. Uma aba do site Nekyoh.

- **Servidor (PHP 8.1+)**: lê o arquivo e monta a lista. Não guarda nada.
- **Navegador (localStorage)**: guarda os projetos e o progresso de coleta.

## Formatos aceitos

| Arquivo | Origem |
|---|---|
| `.litematic` | Litematica (todas as versões de formato, várias regiões) |
| `.schem` | Sponge Schematic v1, v2 e v3 (WorldEdit 7+, FAWE) |
| `.schematic` | MCEdit / WorldEdit 6 / Schematica (IDs numéricos de 1.12 ou menos) |
| `.nbt` | Structure Block vanilla |
| `.json` | "Export JSON" da Material List do Litematica, ou backup exportado pelo próprio site |

## Como a contagem é feita

A conversão bloco → item é uma porta direta do código do Litematica 0.29 (MC 26.3),
então o resultado do arquivo bruto bate com o JSON que o Litematica exporta:

- `MaterialCache.getStateToItemOverride()`: só a fonte de água/lava vira balde; metade de cima de
  portas e plantas altas, cabeceira da cama, `piston_head`, `moving_piston` e portais não contam;
  `farmland` vira terra.
- `MaterialCache.overrideStackSize()`: laje dupla = 2, camadas de neve, velas, picles do mar, ovos
  de tartaruga e líquen brilhante / veia de sculk (1 por face).
- `MaterialCache.getItems()`: vaso com planta = vaso + planta; caldeirão com água (nível 1/2 = poções,
  nível 3 = balde), lava ou neve em pó.
- `MaterialListUtils.convertStatesToStacks()`: qualquer bloco com `waterlogged=true` soma 1 balde de água.
- `Block.asItem()`: tabela em `data/blocks.php` (cenoura, batata, trigo → sementes, redstone,
  tochas/placas/estandartes/cabeças/corais de parede…) e lista de blocos sem item
  (`kelp_plant`, `cave_vines_plant`, caules presos, bolo com vela, fogo…), que o Litematica ignora.

Entidades (molduras, suportes de armadura) e o conteúdo de baús não entram, igual ao Litematica.

## Estrutura

```
index.php            página (usa navbar, terreno e rodapé do site via ../../inc/bootstrap.php)
config.php           limites de upload, memória, volume
api/import.php       endpoint: POST multipart "file" → { ok, project }
src/                 código PHP (namespace SchematicCount\)
  Nbt/               leitor NBT (gzip/zlib/cru), arrays mantidos em binário
  Format/            Litematic, Sponge, Schematic legado, Structure .nbt
  Material/          MaterialResolver (regras do Litematica)
data/                tabelas geradas (itens, bloco→item, IDs legados)
tools/               generate-data.php e cli-import.php
lang/                textos da interface (pt.json, en.json, es.json)
res/                 css, js, imagens, fontes, vendor/bootstrap
```

## Dependências externas

Nenhuma, exceto os ícones dos itens (`blocksitems.com`). Bootstrap 5.3.3 fica em `res/vendor/bootstrap/`
e a fonte Figtree (licença OFL) em `res/fonts/`.

## Instalação

Copie a pasta para o servidor. Não precisa de `composer install` (o autoload funciona sem ele);
se você rodar, o `vendor/autoload.php` também é carregado.

No `php.ini`, deixe `upload_max_filesize` e `post_max_size` iguais ou maiores que
`max_upload_bytes` do `config.php` (32 MB por padrão).

As pastas `src/`, `data/`, `tools/` e `lang/` têm `.htaccess` bloqueando acesso (Apache). No **nginx**,
adicione algo assim:

```nginx
location ~ ^/SchematicCount/(src|data|tools|lang)/ { deny all; }
location = /SchematicCount/config.php { deny all; }
```

## Testar pela linha de comando

```bash
php tools/cli-import.php minha_build.litematic
php tools/cli-import.php minha_build.litematic --json
```

## Atualizar para uma versão nova do Minecraft

Blocos que não estão na tabela continuam funcionando (contam pelo próprio id e aparecem como aviso).
Para atualizar as tabelas:

```bash
git clone --depth 1 https://github.com/PrismarineJS/minecraft-data
git clone --depth 1 --branch assets-json https://github.com/misode/mcmeta
php tools/generate-data.php minecraft-data/data/pc 26.1 mcmeta/assets/minecraft/lang
```

Troque `26.1` pela pasta mais nova disponível em `minecraft-data/data/pc`. A pasta `lang` traz os
nomes oficiais dos itens em português (pt_br), inglês (en_us) e espanhol (es_es).

## Idiomas

Português, inglês e espanhol. Os textos da interface ficam em `lang/pt.json`, `lang/en.json` e
`lang/es.json` (mesmas chaves nos três); os nomes dos itens são os oficiais do jogo, em `data/items.php`.

Como o idioma é escolhido (é o mesmo para o site Nekyoh inteiro, decidido em `inc/bootstrap.php` do site):

1. `?lang=xx` na URL (o seletor de idioma da navbar do site), que grava o cookie `nekyoh_lang`.
2. Cookie `nekyoh_lang` (escolha salva). O cookie antigo `sc_lang` e a chave `schematiccount.lang`
   são aproveitados uma vez e migrados.
3. Idioma do navegador (`Accept-Language`), e por fim o `idioma_padrao` do `config.php` do site.

O `res/js/i18n.js` só mantém o localStorage (`nekyoh_lang`) em dia com o que o servidor decidiu.

O servidor não manda texto em nenhum idioma: erros e avisos vão como código + parâmetros
(ex.: `{"code": "too_big_volume", "params": {"n": 200000000, "max": 150000000}}`) e o navegador traduz.
Por isso projetos salvos também mudam de idioma junto com a interface.

Para adicionar um idioma: crie `lang/xx.json` com as mesmas chaves, coloque `'xx'` em
`I18n::SUPPORTED` (`src/I18n.php`) e gere os nomes dos itens com o arquivo de idioma do jogo correspondente.

## Dados salvos no navegador

Chave `schematiccount.v2` no localStorage (idioma escolhido em `nekyoh_lang`, partilhado com o site). Projetos da versão antiga (chave
`schematic_count_projects`) são migrados automaticamente na primeira visita; a chave antiga é mantida
como cópia de segurança.
