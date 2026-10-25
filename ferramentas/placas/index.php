<?php
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
carregar_textos(__DIR__ . '/lang.php');
$itens = nomes_itens();
$madeiras = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'pale_oak', 'bamboo', 'crimson', 'warped'];
$corantes = ['black', 'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red'];
ferramenta_inicio('placas');
?>
    <div class="ferr">
        <form class="painel coluna" onsubmit="return false" autocomplete="off">
            <?php seletor_versao(); ?>
            <div class="linha manter">
                <label class="campo"><span><?= e(t('sign.wood')) ?></span>
                    <select class="mc-input" id="madeira"><?php foreach ($madeiras as $m): ?><option value="<?= $m ?>"><?= e($itens[$m . '_sign'] ?? $m) ?></option><?php endforeach; ?></select></label>
                <label class="campo"><span><?= e(t('sign.kind')) ?></span>
                    <select class="mc-input" id="tipo"><option value="sign"><?= e(t('sign.k.sign')) ?></option><option value="hanging_sign"><?= e(t('sign.k.hanging_sign')) ?></option></select></label>
            </div>
            <?php for ($i = 1; $i <= 4; $i++): ?>
            <div class="campo sg-linha"><span><?= e(t('sign.line', ['n' => $i])) ?></span><div data-linha="<?= $i - 1 ?>"></div></div>
            <?php endfor; ?>
            <p class="nota" style="margin-top:6px"><?= e(t('ui.editor_hint')) ?> <?= e(t('sign.base_hint')) ?></p>
            <div class="linha manter">
                <label class="campo"><span><?= e(t('sign.dye')) ?></span>
                    <select class="mc-input" id="corante"><?php foreach ($corantes as $c): ?><option value="<?= $c ?>"><?= e($itens[$c . '_dye'] ?? $c) ?></option><?php endforeach; ?></select></label>
                <label class="campo"><span><?= e(t('sign.facing')) ?></span>
                    <select class="mc-input" id="rot"><?php foreach ([8, 0, 12, 4] as $r): ?><option value="<?= $r ?>"><?= e(t("sign.f.$r")) ?></option><?php endforeach; ?></select></label>
            </div>
            <div class="marcas" style="margin-top:16px">
                <label class="marcar"><input type="checkbox" id="brilho"> <?= e(t('sign.glow')) ?></label>
                <label class="marcar"><input type="checkbox" id="cera"> <?= e(t('sign.waxed')) ?></label>
                <label class="marcar"><input type="checkbox" id="atras"> <?= e(t('sign.both')) ?></label>
            </div>
        </form>

        <section class="coluna">
            <div class="sg-cena" id="cena">
                <div class="sg-correntes" id="correntes" hidden><i></i><i></i></div>
                <div class="sg-placa" id="placa"><div class="sg-txt" id="txt"></div></div>
                <div class="sg-poste" id="poste"></div>
            </div>
            <p class="nota alerta" id="avisos"></p>
            <?php caixa_saida('outSet', t('sign.out_set')); caixa_saida('outGive', t('sign.out_give')); ?>
        </section>
    </div>
<?php ferramenta_fim(['sign.'], ['placas.js']); ?>
