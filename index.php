<?php
$BASE = '';
require __DIR__ . '/inc/bootstrap.php';

$splashes = t('splash');
$splash   = is_array($splashes) ? $splashes[array_rand($splashes)] : '';
$ativas   = count(array_filter($ferramentas, fn($f) => $f['estado'] !== 'breve'));
$projetos = array_filter($ferramentas, fn($f) => !empty($f['destaque']) && $f['estado'] !== 'breve');

pagina_inicio(t('meta.title'), '', 'pg-home');
?>
<main>
    <section class="ceu">
        <div class="estrelas" aria-hidden="true"></div>
        <div class="lua" aria-hidden="true"></div>

        <div class="hero">
            <div class="hero-texto">
                <p class="kicker"><span class="xp-orbe" aria-hidden="true"></span><?= e(t('hero.kicker', ['n' => $ativas])) ?></p>
                <h1 class="titulo">
                    <span class="glitch"><?= e($site['nome']) ?></span>
                    <?php if ($splash): ?><span class="splash"><?= e($splash) ?></span><?php endif; ?>
                </h1>
                <p class="tagline"><?= e(t('hero.tagline')) ?></p>
                <p class="sub"><?= e(t('hero.sub')) ?></p>
                <div class="hero-botoes">
                    <a class="mc-btn" href="#ferramentas"><?= e(t('hero.cta_tools')) ?></a>
                    <?php foreach ($projetos as $p): ?>
                    <a class="mc-btn mc-btn-alt" href="<?= e($p['url']) ?>" target="_blank" rel="noopener">
                        <?php if (!empty($p['logo'])): ?><img class="btn-logo" src="<?= e($p['logo']) ?>" alt="" width="22" height="22"><?php else: ?><?= item_icone($p['item'], 'E', 20) ?><?php endif; ?>
                        <?= e(t("tool.{$p['id']}.name")) ?> ↗
                    </a>
                    <?php endforeach; ?>
                </div>
            </div>

            <div class="moldura" aria-hidden="true">
                <div class="moldura-fundo">
                    <img src="assets/img/logo.png" alt="">
                </div>
            </div>
        </div>
    </section>

    <?php terreno(); ?>

    <!-- ============ FERRAMENTAS ============ -->
    <section id="ferramentas" class="secao">
        <header class="secao-cab">
            <h2><?= e(t('tools.title')) ?></h2>
            <p><?= e(t('tools.sub')) ?></p>
            <div class="xp-barra" style="--nivel: <?= $ativas ?>"><span><?= $ativas ?></span></div>
        </header>

        <div class="abas-criativo" role="tablist" aria-label="<?= e(t('tools.title')) ?>">
            <button type="button" role="tab" aria-selected="true" data-filtro="todas"><?= item_icone('compass', 'T', 24) ?><span><?= e(t('tools.all')) ?></span></button>
            <?php foreach ($categorias as $c):
                $ic = ['mods' => 'nether_star', 'construcao' => 'bricks', 'survival' => 'iron_sword', 'comandos' => 'command_block'][$c] ?? 'stone'; ?>
            <button type="button" role="tab" aria-selected="false" data-filtro="<?= e($c) ?>"><?= item_icone($ic, t("cat.$c"), 24) ?><span><?= e(t("cat.$c")) ?></span></button>
            <?php endforeach; ?>
        </div>

        <div class="grelha" id="grelhaFerramentas">
            <?php foreach ($ferramentas as $f):
                $breve    = $f['estado'] === 'breve' || $f['url'] === '';
                $externo  = $f['tipo'] === 'externo';
                $destaque = !empty($f['destaque']);
                $tag      = $breve ? 'div' : 'a';
                $attrs    = $breve ? '' : ' href="' . e($f['url']) . '"' . ($externo ? ' target="_blank" rel="noopener"' : '');
                $nome     = t("tool.{$f['id']}.name");
                $cats     = (array)($f['categoria'] ?? []);
            ?>
            <<?= $tag ?> class="painel cartao estado-<?= e($f['estado']) ?><?= $breve ? ' inativo' : '' ?><?= $destaque ? ' destaque' : '' ?>" data-cat="<?= e(implode(' ', $cats)) ?>"<?= $attrs ?>>
                <div class="cartao-topo">
                    <?php if ($destaque && !empty($f['logo'])): ?>
                    <span class="cartao-logo"><img src="<?= e($f['logo']) ?>" alt="<?= e($nome) ?>" loading="lazy"></span>
                    <?php else: ?>
                    <span class="slot"><?= item_icone($f['item'], $nome, $destaque ? 48 : 32) ?></span>
                    <?php endif; ?>
                    <span class="selo"><?= e(t("status.{$f['estado']}")) ?></span>
                </div>
                <div class="cartao-corpo">
                    <?php if ($destaque): ?><p class="rotulo"><?= e(t("tool.{$f['id']}.label")) ?></p>
                    <?php elseif ($cats): ?><p class="cat-rotulo"><?= e(implode(' · ', array_map(fn($c) => t("cat.$c"), $cats))) ?></p><?php endif; ?>
                    <h3><?= e($nome) ?><?php if ($externo && !$breve): ?> <span class="seta">↗</span><?php endif; ?></h3>
                    <p><?= e(t("tool.{$f['id']}.desc")) ?></p>
                    <?php if (!empty($f['tags'])): ?>
                    <ul class="tags"><?php foreach ($f['tags'] as $tg): ?><li><?= e($tg) ?></li><?php endforeach; ?></ul>
                    <?php endif; ?>
                </div>
                <?php if (!$breve): ?>
                <span class="abrir"><?= $externo ? e(parse_url($f['url'], PHP_URL_HOST)) : e(t('tools.open')) ?> →</span>
                <?php endif; ?>
            </<?= $tag ?>>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- ============ CANAIS ============ -->
    <section id="canais" class="secao">
        <header class="secao-cab">
            <h2><?= e(t('channels.title')) ?></h2>
            <p><?= e(t('channels.sub')) ?></p>
            <div class="xp-barra" style="--nivel: <?= count($canais) ?>"><span><?= count($canais) ?></span></div>
        </header>

        <div class="canais">
            <?php foreach ($canais as $c): ?>
            <a class="painel canal" href="<?= e($c['url']) ?>" target="_blank" rel="noopener">
                <div class="jogador">
                    <span class="nametag"><?= e($c['nome']) ?></span>
                    <img class="cabeca" src="<?= e($c['foto']) ?>" alt="" width="96" height="96" loading="lazy"
                         onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'cabeca cabeca-vazia',textContent:'<?= e(strtoupper(substr($c['nome'], 0, 1))) ?>'}))">
                </div>
                <div class="canal-info">
                    <h3><?= e($c['nome']) ?></h3>
                    <p><?= e(t("channel.{$c['id']}.desc")) ?></p>
                    <span class="yt-btn">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9l5.8 3.1z" fill="currentColor"/></svg>
                        <?= e(t('channels.watch')) ?>
                    </span>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- ============ REFERÊNCIAS ============ -->
    <section id="referencias" class="secao">
        <header class="secao-cab">
            <h2><?= e(t('refs.title')) ?></h2>
            <p><?= e(t('refs.sub')) ?></p>
            <div class="xp-barra" style="--nivel: <?= count($referencias) ?>"><span><?= count($referencias) ?></span></div>
        </header>

        <ul class="toasts">
            <?php foreach ($referencias as $r): ?>
            <li>
                <a class="toast" href="<?= e($r['url']) ?>" target="_blank" rel="noopener">
                    <span class="toast-icone"><?= item_icone($r['item'], $r['nome'], 32) ?></span>
                    <span class="toast-texto">
                        <small><?= e(t('refs.toast')) ?></small>
                        <strong><?= e($r['nome']) ?> <span class="seta">↗</span></strong>
                        <span><?= e(t("ref.{$r['id']}.desc")) ?></span>
                    </span>
                </a>
            </li>
            <?php endforeach; ?>
        </ul>
    </section>
</main>

<?php terreno(); ?>
<?php pagina_fim(); ?>
