<?php
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
carregar_textos(__DIR__ . '/lang.php');
ferramenta_inicio('motd');
?>
    <div class="ferr">
        <form class="painel coluna" onsubmit="return false" autocomplete="off">
            <div class="campo"><span><?= e(t('motd.line1')) ?></span><div id="l1"></div></div>
            <div class="campo"><span><?= e(t('motd.line2')) ?></span><div id="l2"></div></div>
            <p class="nota" style="margin-top:6px"><?= e(t('ui.editor_hint')) ?></p>
            <button type="button" class="mc-btn mc-btn-sm" id="centrar" style="align-self:flex-start;margin-top:10px"><?= e(t('motd.center')) ?></button>
            <div class="linha manter">
                <label class="campo"><span><?= e(t('motd.server_name')) ?></span><input class="mc-input" id="nome" value="Nekyoh Server"></label>
                <label class="campo"><span><?= e(t('motd.players')) ?></span><input class="mc-input" id="jog" value="12/100"></label>
            </div>
            <label class="campo"><span><?= e(t('motd.icon')) ?></span><input class="mc-input" type="file" id="icone" accept="image/png,image/*"><small><?= e(t('motd.icon_hint')) ?></small></label>
        </form>

        <section class="coluna">
            <div class="motd-lista">
                <div class="motd-entrada">
                    <img id="iconeImg" src="<?= e($BASE) ?>assets/img/favicon_96.png" alt="" width="64" height="64">
                    <div class="motd-textos">
                        <div class="motd-topo"><span class="mc-t" id="pNome"></span><span class="motd-jog"><span id="pJog"></span><i class="motd-sinal"><b></b><b></b><b></b><b></b><b></b></i></span></div>
                        <div class="motd-linha" id="p1"></div>
                        <div class="motd-linha" id="p2"></div>
                    </div>
                </div>
            </div>
            <p class="nota" id="larguras"></p>
            <?php caixa_saida('outProps', t('motd.out_props')); caixa_saida('outAmp', t('motd.out_amp')); caixa_saida('outRaw', t('motd.out_raw')); ?>
        </section>
    </div>
<?php ferramenta_fim(['motd.'], ['motd.js']); ?>
