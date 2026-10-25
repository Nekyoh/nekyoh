<?php
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
carregar_textos(__DIR__ . '/lang.php');

$usados = ['diamond_sword', 'diamond_axe', 'diamond_pickaxe', 'diamond_shovel', 'diamond_hoe', 'diamond_spear', 'mace', 'trident',
           'bow', 'crossbow', 'diamond_helmet', 'diamond_chestplate', 'diamond_leggings', 'diamond_boots', 'elytra',
           'fishing_rod', 'shears', 'shield', 'flint_and_steel', 'enchanted_book'];
$todos = nomes_itens();
$itens = array_intersect_key($todos, array_flip($usados));

ferramenta_inicio('encantamentos');
?>
    <div class="ferr larga">
        <div class="abas" id="abas" role="tablist">
            <button type="button" role="tab" data-aba="comb" aria-selected="true"><?= item_icone('enchanted_book', 'E', 24) ?> <?= e(t('ench.tab_comb')) ?></button>
            <button type="button" role="tab" data-aba="xp" aria-selected="false"><?= item_icone('experience_bottle', 'X', 24) ?> <?= e(t('ench.tab_xp')) ?></button>
        </div>

        <!-- compatibilidade + bigorna -->
        <div class="ench-comb" data-painel="comb">
            <section class="painel">
                <h2 class="painel-titulo"><?= e(t('ench.item')) ?>: <span id="nomeItem"></span></h2>
                <div class="ench-itens" id="itens" role="group"></div>
                <h2 class="painel-titulo" style="margin-top:22px"><?= e(t('ench.pick')) ?></h2>
                <ul class="ench-lista" id="lista"></ul>
            </section>
            <section class="painel">
                <p class="ench-status" id="status"></p>
                <h2 class="painel-titulo"><?= e(t('ench.plan')) ?></h2>
                <p class="nota" style="margin-top:-8px"><?= e(t('ench.plan_hint')) ?></p>
                <ol class="ench-passos" id="passos"></ol>
                <p class="ench-total" id="total"></p>
                <p class="nota alerta" id="caro" hidden><?= e(t('ench.too_exp')) ?></p>
                <p class="nota"><?= e(t('ench.anvil_hint')) ?></p>
            </section>
        </div>

        <!-- XP -->
        <div class="ench-xp" data-painel="xp" hidden>
            <section class="painel">
                <div class="linha manter">
                    <label class="campo"><span><?= e(t('ench.cur')) ?></span><input class="mc-input" type="number" min="0" max="21863" id="nivA" value="0"></label>
                    <label class="campo"><span><?= e(t('ench.target')) ?></span><input class="mc-input" type="number" min="0" max="21863" id="nivB" value="30"></label>
                </div>
                <div class="xp-barra-grande"><div id="xpFill"></div><span id="xpNivel">30</span></div>
                <label class="campo" style="margin-top:22px"><span><?= e(t('ench.points_have')) ?></span><input class="mc-input" type="number" min="0" id="pontos" value="1395"></label>
                <p class="nota" id="pontosRes"></p>
            </section>
            <section class="coluna">
                <div class="numeros">
                    <div class="painel numero principal"><small><?= e(t('ench.need')) ?></small><strong id="xpPrecisa">0</strong></div>
                    <div class="painel numero"><small><?= e(t('ench.bottles')) ?></small><strong id="xpFrascos">0</strong></div>
                    <div class="painel numero"><small id="xpTotalRot"></small><strong id="xpTotal">0</strong></div>
                </div>
                <div class="painel">
                    <h2 class="painel-titulo"><?= e(t('ench.table')) ?></h2>
                    <p class="nota" style="margin-top:0" id="mesa"></p>
                    <table class="ench-tabela" id="tabela"></table>
                </div>
            </section>
        </div>
    </div>
<?php ferramenta_fim(['ench.'], ['encantamentos.js'], ['itens' => $itens]); ?>
