<?php
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
carregar_textos(__DIR__ . '/lang.php');
ferramenta_inicio('title');

function bloco_texto(string $id): void { ?>
    <div class="campo tt-bloco"><span><?= e(t("title.$id")) ?></span><div data-bloco="<?= $id ?>"></div></div>
<?php }
?>
    <div class="ferr">
        <form class="painel coluna" onsubmit="return false" autocomplete="off">
            <label class="campo"><span><?= e(t('ui.target')) ?></span><input class="mc-input" id="alvo" value="@a"><small><?= e(t('title.target_hint')) ?></small></label>
            <?php bloco_texto('title'); bloco_texto('subtitle'); bloco_texto('actionbar'); ?>
            <p class="nota" style="margin-top:6px"><?= e(t('ui.editor_hint')) ?></p>
            <div class="campo"><span><?= e(t('title.times')) ?></span>
                <div class="linha manter" style="--n:3">
                    <?php foreach (['fadein' => 10, 'stay' => 70, 'fadeout' => 20] as $k => $v): ?>
                    <label class="campo"><small><?= e(t("title.$k")) ?> · <b id="s_<?= $k ?>"></b></small><input class="mc-input" type="number" min="0" max="72000" id="<?= $k ?>" value="<?= $v ?>"></label>
                    <?php endforeach; ?>
                </div>
            </div>
        </form>

        <section class="coluna">
            <div class="tt-tela" id="tela">
                <div class="tt-titulos" id="titulos"><div class="tt-t" id="pTitle"></div><div class="tt-s" id="pSub"></div></div>
                <div class="tt-bar" id="pBar"></div>
                <div class="tt-hotbar" aria-hidden="true"><?php for ($i = 0; $i < 9; $i++) echo '<i' . ($i === 0 ? ' class="sel"' : '') . '></i>'; ?></div>
                <button type="button" class="mc-btn mc-btn-sm tt-play" id="play"><?= e(t('title.play')) ?></button>
            </div>
            <?php caixa_saida('cmds', t('title.commands')); ?>
            <p class="nota"><?= e(t('title.note')) ?></p>
        </section>
    </div>
<?php ferramenta_fim(['title.'], ['title.js']); ?>
