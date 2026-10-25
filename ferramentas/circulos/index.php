<?php
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
carregar_textos(__DIR__ . '/lang.php');
ferramenta_inicio('circulos');
?>
    <div class="ferr circ">
        <form class="painel coluna" id="form" onsubmit="return false" autocomplete="off">
            <div class="campo"><span><?= e(t('circ.shape')) ?></span>
                <div class="segmentos" id="formas">
                    <?php foreach (['circulo', 'elipse', 'esfera', 'cupula'] as $f): ?>
                    <button type="button" class="mc-btn mc-btn-sm" data-forma="<?= $f ?>"><?= e(t("circ.s.$f")) ?></button>
                    <?php endforeach; ?>
                </div>
            </div>

            <div class="linha manter">
                <label class="campo"><span id="rotLargura"><?= e(t('circ.diameter')) ?></span>
                    <input class="mc-input" type="number" id="largura" min="1" max="255" value="15" inputmode="numeric"></label>
                <label class="campo" id="campoComp"><span><?= e(t('circ.length')) ?></span>
                    <input class="mc-input" type="number" id="comprimento" min="1" max="255" value="9" inputmode="numeric"></label>
            </div>
            <input class="mc-input" type="range" id="larguraRange" min="1" max="121" value="15" aria-label="<?= e(t('circ.diameter')) ?>">
            <label class="campo" id="campoAltura"><span><?= e(t('circ.height')) ?></span>
                <input class="mc-input" type="number" id="altura" min="1" max="128" value="1" inputmode="numeric">
                <small><?= e(t('circ.height_hint')) ?></small></label>

            <div class="campo"><span><?= e(t('circ.fill')) ?></span>
                <div class="segmentos" id="preench">
                    <?php foreach (['cheio', 'fino', 'grosso'] as $f): ?>
                    <button type="button" class="mc-btn mc-btn-sm" data-preench="<?= $f ?>"><?= e(t("circ.f.$f")) ?></button>
                    <?php endforeach; ?>
                </div>
            </div>

            <div class="campo" id="campoCamada">
                <span id="rotCamada"></span>
                <div class="camada-ctrl">
                    <button type="button" class="mc-btn mc-btn-sm" id="camMenos" aria-label="−">−</button>
                    <input class="mc-input" type="range" id="camada" min="1" max="1" value="1" aria-label="<?= e(t('circ.layer')) ?>">
                    <button type="button" class="mc-btn mc-btn-sm" id="camMais" aria-label="+">+</button>
                </div>
            </div>

            <div class="marcas circ-marcas">
                <label class="marcar"><input type="checkbox" id="fantasma" checked> <?= e(t('circ.ghost')) ?></label>
                <label class="marcar"><input type="checkbox" id="grade" checked> <?= e(t('circ.grid')) ?></label>
                <label class="marcar"><input type="checkbox" id="numeros"> <?= e(t('circ.numbers')) ?></label>
                <label class="marcar"><input type="checkbox" id="cortar" checked> <?= e(t('circ.cut')) ?></label>
            </div>
            <p class="nota"><?= e(t('circ.hint')) ?></p>
        </form>

        <section class="coluna">
            <div class="numeros">
                <div class="painel numero principal"><small><?= e(t('circ.blocks_layer')) ?></small><strong id="nCamada">0</strong></div>
                <div class="painel numero"><small><?= e(t('circ.blocks_total')) ?></small><strong id="nTotal">0</strong></div>
                <div class="painel numero"><small><?= e(t('circ.size')) ?></small><strong id="nTamanho">—</strong></div>
            </div>

            <div class="visor" id="visor">
                <div class="visor-barra">
                    <div class="abas visor-abas" id="abasVista" role="tablist">
                        <button type="button" role="tab" data-vista="2d" aria-selected="true"><?= e(t('circ.view_2d')) ?></button>
                        <button type="button" role="tab" data-vista="3d" aria-selected="false"><?= e(t('circ.view_3d')) ?></button>
                    </div>
                    <div class="visor-ctrl">
                        <button type="button" class="mc-btn mc-btn-sm" id="zoomMenos" title="<?= e(t('circ.zoom_out')) ?>" aria-label="<?= e(t('circ.zoom_out')) ?>">−</button>
                        <button type="button" class="mc-btn mc-btn-sm" id="zoomMais" title="<?= e(t('circ.zoom_in')) ?>" aria-label="<?= e(t('circ.zoom_in')) ?>">+</button>
                        <button type="button" class="mc-btn mc-btn-sm" id="zoomAjustar"><?= e(t('circ.zoom_fit')) ?></button>
                        <button type="button" class="mc-btn mc-btn-sm" id="telaCheia" title="<?= e(t('circ.fullscreen')) ?>" aria-label="<?= e(t('circ.fullscreen')) ?>">⛶</button>
                    </div>
                </div>
                <div class="visor-area" id="area">
                    <canvas id="tela2d" tabindex="0"></canvas>
                    <div id="cena3d" class="cena3d" hidden></div>
                    <div class="visor-msg" id="msg3d" hidden></div>
                    <div class="visor-camada" id="selo"></div>
                </div>
                <div class="visor-rodape"><span id="ajuda"><?= e(t('circ.help_2d')) ?></span><span id="info"></span></div>
            </div>

            <details class="painel circ-linhas">
                <summary class="painel-titulo"><?= e(t('circ.rows')) ?></summary>
                <ol id="linhas"></ol>
            </details>
        </section>
    </div>
    <script>window.NK_THREE = <?= json_encode($BASE . 'assets/vendor/three/three.module.min.js') ?>;</script>
<?php ferramenta_fim(['circ.'], ['circulos.js']); ?>
