<?php
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
carregar_textos(__DIR__ . '/lang.php');
$itens = nomes_itens();
ferramenta_inicio('armorstand');
$opcoes = ['ShowArms', 'Small', 'NoBasePlate', 'Invisible', 'NoGravity', 'Invulnerable', 'Marker', 'CustomNameVisible', 'Glowing'];
$partes = ['Head', 'Body', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg'];
?>
    <div class="ferr">
        <form class="painel coluna" onsubmit="return false" autocomplete="off">
            <?php seletor_versao(); ?>
            <div class="campo"><span><?= e(t('as.options')) ?></span>
                <div class="marcas"><?php foreach ($opcoes as $o): ?><label class="marcar"><input type="checkbox" data-op="<?= $o ?>"> <?= e(t("as.o.$o")) ?></label><?php endforeach; ?></div></div>
            <div class="campo"><span><?= e(t('as.name')) ?></span><div id="nome"></div></div>
            <div class="linha">
                <label class="campo"><span><?= e(t('as.rotation')) ?></span><input class="mc-input" type="number" id="rot" min="0" max="359" value="0"></label>
            </div>
            <div class="campo"><span><?= e(t('as.presets')) ?></span>
                <div class="segmentos" id="presets"><?php foreach (['padrao', 'acenar', 'andar', 'apontar', 'sentado', 'vitoria', 'zumbi', 'zero'] as $p): ?>
                    <button type="button" class="mc-btn mc-btn-sm" data-preset="<?= $p ?>"><?= e(t("as.p.$p")) ?></button><?php endforeach; ?></div></div>
            <div class="campo"><span><?= e(t('as.pose')) ?></span>
                <div class="segmentos" id="partes"><?php foreach ($partes as $i => $p): ?>
                    <button type="button" class="mc-btn mc-btn-sm" data-parte="<?= $p ?>" aria-pressed="<?= $i === 2 ? 'true' : 'false' ?>"><?= e(t("as.part.$p")) ?></button><?php endforeach; ?></div>
                <?php foreach (['x', 'y', 'z'] as $eixo): ?>
                <div class="as-eixo"><b><?= strtoupper($eixo) ?></b><input class="mc-input" type="range" min="-180" max="180" data-eixo="<?= $eixo ?>"><input class="mc-input" type="number" min="-180" max="180" data-eixon="<?= $eixo ?>"></div>
                <?php endforeach; ?>
                <small><?= e(t('as.hint')) ?></small></div>
            <div class="campo"><span><?= e(t('as.equip')) ?></span>
                <div class="as-equip"><?php foreach (['head', 'chest', 'legs', 'feet', 'mainhand', 'offhand'] as $s): ?>
                    <label><small><?= e(t("as.e.$s")) ?></small><input class="mc-input" data-slot="<?= $s ?>" placeholder="—"><button type="button" class="as-limpar" data-limpar="<?= $s ?>" aria-label="<?= e(t('ui.remove')) ?>">✕</button></label><?php endforeach; ?></div>
                </div>
        </form>

        <section class="coluna">
            <div class="as-cena">
                <figure><svg id="vFrente" viewBox="-24 -44 48 52"></svg><figcaption><?= e(t('as.front')) ?></figcaption></figure>
                <figure><svg id="vLado" viewBox="-24 -44 48 52"></svg><figcaption><?= e(t('as.side')) ?></figcaption></figure>
            </div>
            <?php caixa_saida('cmd'); ?>
        </section>
    </div>
<?php ferramenta_fim(['as.'], ['armor-stand.js'], ['itens' => $itens]); ?>
