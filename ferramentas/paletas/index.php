<?php
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
carregar_textos(__DIR__ . '/lang.php');

$todos = nomes_itens();
$blocos = array_values(array_filter(require __DIR__ . '/blocos.php', fn($b) => isset($todos[$b])));
$itens = array_intersect_key($todos, array_flip($blocos));   // só blocos: nomes oficiais para a busca
$paletas = array_map(fn($p) => $p + ['nome' => t('pal.p.' . $p['id'])], require __DIR__ . '/paletas.php');

ferramenta_inicio('paletas');
?>
    <div class="ferr pal">
        <!-- montar paleta -->
        <form class="painel coluna pal-editor" id="editor" onsubmit="return false" autocomplete="off">
            <h2 class="painel-titulo" id="edTitulo"><?= e(t('pal.new')) ?></h2>
            <label class="campo"><span><?= e(t('pal.name')) ?></span>
                <input class="mc-input" id="edNome" maxlength="40" placeholder="<?= e(t('pal.name_ph')) ?>"></label>
            <label class="campo"><span><?= e(t('pal.add')) ?></span>
                <span class="busca"><input class="mc-input" id="edBusca" placeholder="<?= e(t('pal.search_block')) ?>"></span></label>
            <div class="pal-slots" id="edSlots" aria-live="polite"></div>
            <p class="nota" id="edNota"><?= e(t('pal.max')) ?></p>
            <div class="segmentos">
                <button type="button" class="mc-btn mc-btn-sm" id="edLimpar"><?= e(t('pal.cancel')) ?></button>
                <button type="button" class="mc-btn mc-btn-sm mc-btn-alt" id="edSalvar"><?= e(t('pal.save')) ?></button>
            </div>
        </form>

        <!-- paletas -->
        <section class="coluna">
            <div class="segmentos pal-filtros" role="tablist">
                <?php foreach (['todas', 'tema', 'gradiente', 'minhas'] as $i => $f): ?>
                <button type="button" class="mc-btn mc-btn-sm" role="tab" data-filtro="<?= $f ?>" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>"><?= e(t("pal.f.$f")) ?></button>
                <?php endforeach; ?>
            </div>
            <p class="nota" id="weDica"></p>
            <div class="pal-grelha" id="grelha"></div>
        </section>
    </div>
<?php ferramenta_fim(['pal.'], ['paletas.js'], ['itens' => $itens, 'paletas' => $paletas]); ?>
