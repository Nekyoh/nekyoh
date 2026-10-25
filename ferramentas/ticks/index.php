<?php
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
carregar_textos(__DIR__ . '/lang.php');
ferramenta_inicio('ticks');
$unidades = ['gt', 'rt', 's', 'min', 'h', 'dia'];
?>
    <div class="ferr">
        <form class="painel coluna" onsubmit="return false">
            <div class="linha manter">
                <label class="campo"><span><?= e(t('ticks.value')) ?></span>
                    <input class="mc-input" type="number" id="valor" value="20" step="any" min="0" inputmode="decimal"></label>
                <label class="campo"><span><?= e(t('ticks.unit')) ?></span>
                    <select class="mc-input" id="unidade">
                        <?php foreach ($unidades as $u): ?><option value="<?= $u ?>"><?= e(t("ticks.u.$u")) ?></option><?php endforeach; ?>
                    </select></label>
            </div>
            <p class="nota"><?= e(t('ticks.note')) ?></p>
            <div class="campo"><span><?= e(t('ticks.repeater')) ?></span>
                <div class="ticks-rep" id="repetidor"></div>
                <small><?= e(t('ticks.repeater_hint')) ?></small></div>
        </form>

        <section class="coluna">
            <div class="numeros" id="numeros">
                <?php foreach ($unidades as $u): ?>
                <div class="painel numero" data-u="<?= $u ?>"><small><?= e(t("ticks.u.$u")) ?></small><strong>0</strong></div>
                <?php endforeach; ?>
            </div>

            <div class="painel">
                <h2 class="painel-titulo"><?= e(t('ticks.clock')) ?></h2>
                <div class="ticks-relogio">
                    <div class="ceu-mini" id="ceuMini"><span class="sol" id="sol"></span><span class="lua-mini" id="luaMini"></span></div>
                    <div>
                        <strong class="ticks-hora" id="hora">06:00</strong>
                        <p class="ticks-fase" id="fase"></p>
                        <p class="nota" id="flags"></p>
                    </div>
                </div>
                <label class="campo" style="margin-top:16px"><span><?= e(t('ticks.daytime')) ?>: <b id="tempoN">0</b></span>
                    <input class="mc-input" type="range" id="tempo" min="0" max="23999" step="10" value="1000"></label>
                <div class="segmentos" id="atalhos" style="margin-top:12px">
                    <?php foreach (['amanhecer' => 0, 'dia' => 1000, 'meio_dia' => 6000, 'entardecer' => 12000, 'noite' => 13000, 'meia_noite' => 18000] as $f => $v): ?>
                    <button type="button" class="mc-btn mc-btn-sm" data-tempo="<?= $v ?>"><?= e(t("ticks.phase.$f")) ?></button>
                    <?php endforeach; ?>
                </div>
                <div style="margin-top:16px"><?php caixa_saida('tempoCmd', t('ticks.cmd')); ?></div>
            </div>
        </section>
    </div>
<?php ferramenta_fim(['ticks.'], ['ticks.js']); ?>
