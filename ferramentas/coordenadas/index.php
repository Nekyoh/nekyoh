<?php
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
carregar_textos(__DIR__ . '/lang.php');
ferramenta_inicio('coordenadas');

function bloco_dimensao(string $id, string $item, string $titulo): void { ?>
    <section class="painel dim dim-<?= $id ?>">
        <h2 class="painel-titulo"><span class="slot-p"><?= item_icone($item, $titulo, 28) ?></span><?= e($titulo) ?></h2>
        <input class="mc-input coord-colar" data-colar="<?= $id ?>" placeholder="<?= e(t('coord.paste_ph')) ?>" aria-label="<?= e(t('coord.paste')) ?>" autocomplete="off">
        <p class="nota coord-colar-nota" id="<?= $id ?>Nota"></p>
        <div class="linha manter" style="--n:3">
            <?php foreach (['x', 'y', 'z'] as $eixo): ?>
            <label class="campo"><span><?= strtoupper($eixo) ?></span>
                <input class="mc-input" type="number" step="any" inputmode="decimal" id="<?= $id . $eixo ?>" data-dim="<?= $id ?>" data-eixo="<?= $eixo ?>"></label>
            <?php endforeach; ?>
        </div>
        <p class="nota dim-exato" id="<?= $id ?>Exato"></p>
        <?php caixa_saida($id . 'Cmd', t('coord.tp_dim')); caixa_saida($id . 'Tp', t('coord.tp_simple')); ?>
    </section>
<?php }
?>
    <div class="ferr larga">
        <div class="coord-dims">
            <?php bloco_dimensao('ow', 'grass_block', t('coord.ow')); ?>
            <div class="coord-seta" aria-hidden="true"><span>÷ 8</span><b>⇄</b><span>× 8</span></div>
            <?php bloco_dimensao('ne', 'netherrack', t('coord.ne')); ?>
        </div>

        <div class="coord-baixo">
            <section class="painel">
                <h2 class="painel-titulo"><?= e(t('coord.how_title')) ?></h2>
                <p class="nota" style="margin-top:0"><?= t('coord.how') ?></p>
                <p class="nota"><?= e(t('coord.y_note')) ?></p>
                <p class="nota"><b><?= e(t('coord.dist')) ?>:</b> <span id="dist">—</span></p>
            </section>
            <section class="painel">
                <h2 class="painel-titulo"><?= e(t('coord.saved_title')) ?></h2>
                <div class="coord-guardar">
                    <input class="mc-input" id="nomePortal" maxlength="30" placeholder="<?= e(t('coord.name_ph')) ?>">
                    <button type="button" class="mc-btn mc-btn-sm mc-btn-alt" id="guardar"><?= e(t('coord.save')) ?></button>
                </div>
                <ul class="lista-itens coord-lista" id="lista"></ul>
            </section>
        </div>
    </div>
<?php ferramenta_fim(['coord.'], ['coordenadas.js']); ?>
