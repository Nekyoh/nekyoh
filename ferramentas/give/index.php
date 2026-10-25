<?php
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
carregar_textos(__DIR__ . '/lang.php');
carregar_textos(__DIR__ . '/../encantamentos/lang.php');   // nomes oficiais dos encantamentos
$itens = nomes_itens();
ferramenta_inicio('give');
?>
    <div class="ferr">
        <form class="painel coluna" onsubmit="return false" autocomplete="off">
            <?php seletor_versao(); ?>
            <label class="campo"><span><?= e(t('ui.target')) ?></span><input class="mc-input" id="alvo" value="@p"></label>
            <div class="linha" style="grid-template-columns: 1fr 110px">
                <label class="campo"><span><?= e(t('give.item')) ?></span>
                    <div class="gv-item"><span class="slot-p" id="slotItem"></span><input class="mc-input" id="item" placeholder="<?= e(t('ui.search_item')) ?>"></div></label>
                <label class="campo"><span><?= e(t('give.count')) ?></span><input class="mc-input" type="number" id="qtd" min="1" max="99" value="1"></label>
            </div>

            <div class="campo"><span><?= e(t('give.name')) ?></span><div id="nome"></div></div>
            <div class="campo"><span><?= e(t('give.lore')) ?></span><div id="lore"></div></div>
            <p class="nota" style="margin-top:6px"><?= e(t('ui.editor_hint')) ?></p>
            <div class="campo"><span><?= e(t('give.ench')) ?></span>
                <ul class="gv-ench" id="enchs"></ul>
                <button type="button" class="mc-btn mc-btn-sm" id="addEnch" style="align-self:flex-start"><?= e(t('give.add_ench')) ?></button>
                <small><?= e(t('give.lvl_note')) ?></small></div>
            <div class="marcas" style="margin-top:14px">
                <label class="marcar"><input type="checkbox" id="inq"> <?= e(t('give.unbreakable')) ?></label>
                <label class="marcar"><input type="checkbox" id="brilho"> <?= e(t('give.glint')) ?></label>
            </div>
        </form>

        <section class="coluna">
            <div class="gv-cena">
                <div class="gv-inv"><span class="slot-p gv-slot" id="slotGrande"></span></div>
                <div class="mc-tooltip gv-tip" id="tip"></div>
            </div>
            <?php caixa_saida('cmd'); ?>
        </section>
    </div>
<?php ferramenta_fim(['give.', 'ench.e.'], ['give.js'], ['itens' => $itens]); ?>
