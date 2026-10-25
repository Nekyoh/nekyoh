# Nekyoh

Ferramentas de Minecraft feitas por **Tekyoh** e **Nezoru** — direto no navegador, em português, inglês e espanhol.

🌐 **Site:** https://nekyoh.tech · 🧩 **Epic Craft (mod):** https://epiccraft.nekyoh.tech · 🚀 **NekyLauncher:** https://launcher.nekyoh.tech

## Ferramentas

| Construção | Survival | Comandos e servidor |
|---|---|---|
| SchematicCount (lista de materiais de `.litematic`, `.schem`, `.schematic`, `.nbt`) | Coordenadas Overworld ↔ Nether | Gerador de MOTD |
| Círculos e Esferas (2D por camada + 3D) | Encantamentos, bigorna e XP | Gerador de `/title` |
| Paletas de Blocos | Conversor de Ticks | Placas personalizadas |
| | | Gerador de `/give` |
| | | Armor Stands |

## Rodar localmente

Precisa de **PHP 8.1+** (com `zlib` e `json`). Não tem build nem dependências para instalar.

```bash
php -S localhost:8080
```

Abra http://localhost:8080.

Para o SchematicCount aceitar arquivos grandes, no `php.ini` deixe `upload_max_filesize` e `post_max_size` com 32M ou mais.

## Estrutura

```
index.php                  home
config.php                 ferramentas, canais, projetos e links (edite aqui)
lang/{pt,en,es}.php        textos da home
inc/bootstrap.php          idioma, layout e funções partilhadas
inc/textos-ferramentas.php textos comuns das ferramentas
assets/                    CSS, JS, imagens, Three.js (assets/vendor/three)
ferramentas/<nome>/        cada ferramenta: index.php, lang.php e o JS dela
ferramentas/schematiccount/ ver README.md próprio
```

O idioma é um só para o site inteiro: `?lang=pt|en|es`, cookie `nekyoh_lang` ou o idioma do navegador.

## Licença

Código sob a licença [MIT](LICENSE).

Partes de terceiros mantêm as próprias licenças: [Three.js](assets/vendor/three/LICENSE) (MIT), Bootstrap (MIT) e a fonte Figtree (OFL) em `ferramentas/schematiccount/res/`.

Não é um produto oficial do Minecraft. Não aprovado nem associado à Mojang ou à Microsoft. Nomes de itens e blocos são do jogo.
