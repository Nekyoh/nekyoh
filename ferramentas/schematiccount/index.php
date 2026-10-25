<?php
// SchematicCount — aba do site Nekyoh.
// O site entrega o idioma, a navbar, o terreno e o rodapé (inc/bootstrap.php).
$BASE = '../../';
require __DIR__ . '/../../inc/bootstrap.php';
require __DIR__ . '/src/bootstrap.php';

use SchematicCount\I18n;

$assetVersion = '2.3.0';

// Idioma: o mesmo do site (?lang > cookie "nekyoh_lang" > idioma do navegador)
$lang = in_array($LANG, I18n::SUPPORTED, true)
    ? $LANG
    : I18n::detect($_COOKIE[I18n::COOKIE] ?? null, $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? null);
$meta = I18n::dict($lang)['_meta'];
header('Content-Language: ' . $meta['html']);

/** Texto traduzido (escapado) */
$t = static fn(string $key, array $vars = []): string => I18n::t($lang, $key, $vars);
/** Atributo data-i18n para o JS conseguir trocar o texto depois */
$i = static fn(string $key): string => 'data-i18n="' . htmlspecialchars($key, ENT_QUOTES) . '"';
?>
<!DOCTYPE html>
<html lang="<?= $meta['html'] ?>" data-bs-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $t('page.title') ?></title>
    <meta name="description" content="<?= $t('page.description') ?>">

    <meta name="theme-color" content="#14121a">
    <link rel="stylesheet" href="./res/vendor/bootstrap/bootstrap.min.css?v=5.3.3">
    <?php site_estilos(); ?>
    <link rel="stylesheet" href="./res/css/style.css?v=<?= $assetVersion ?>">

    <link rel="icon" type="image/png" sizes="32x32" href="./res/img/favicon/favicon_32x32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="./res/img/favicon/favicon_48x48.png">
    <link rel="icon" type="image/png" sizes="96x96" href="./res/img/favicon/favicon_96x96.png">
    <link rel="icon" type="image/png" sizes="144x144" href="./res/img/favicon/favicon_144x144.png">
</head>
<body class="sc-body pg-ferramenta">

<?php site_cabecalho(); /* navbar do Nekyoh (o seletor de idioma dela vale para o site todo) */ ?>

<main class="sc-app" id="scApp">

    <!-- Cabeçalho da ferramenta -->
    <header class="sc-head">
        <div class="sc-brand">
            <a class="voltar" href="<?= e($BASE) ?>">← <?= e(t('nav.back')) ?></a>
            <h1 class="sc-title">SchematicCount</h1>
            <p class="sc-brand-sub" <?= $i('brand.tagline') ?>><?= $t('brand.tagline') ?></p>
        </div>

        <div class="sc-head-actions">
            <div class="dropdown" id="projectSwitcher">
                <button class="sc-btn sc-btn-ghost dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" id="projectSwitcherBtn">
                    <span <?= $i('header.projects') ?>><?= $t('header.projects') ?></span> <span class="sc-count-pill" id="projectCount">0</span>
                </button>
                <div class="dropdown-menu dropdown-menu-end sc-project-menu" id="projectMenu"></div>
            </div>
            <button class="sc-btn sc-btn-primary" type="button" id="btnOpenImport" <?= $i('header.import') ?>><?= $t('header.import') ?></button>
        </div>
    </header>

    <!-- Estado vazio -->
    <section class="sc-empty d-none" id="emptyState">
        <label class="sc-drop sc-drop-large" for="fileInputEmpty" id="emptyDrop">
            <span class="sc-drop-slots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
            <strong <?= $i('empty.title') ?>><?= $t('empty.title') ?></strong>
            <span <?= $i('empty.formats') ?>><?= $t('empty.formats') ?></span>
            <span class="sc-btn sc-btn-primary" <?= $i('empty.button') ?>><?= $t('empty.button') ?></span>
        </label>
        <input type="file" id="fileInputEmpty" class="visually-hidden" accept=".litematic,.schem,.schematic,.nbt,.json">
    </section>

    <!-- Projeto ativo -->
    <section class="sc-project d-none" id="projectView">

        <div class="sc-summary">
            <div class="sc-summary-main">
                <div class="sc-title-row">
                    <h2 class="sc-project-title" id="projectTitle"></h2>
                    <div class="dropdown">
                        <button class="sc-icon-btn" type="button" data-bs-toggle="dropdown" aria-label="<?= $t('project.options') ?>" data-i18n-attr="aria-label:project.options">
                            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><circle cx="3" cy="8" r="1.6"/><circle cx="8" cy="8" r="1.6"/><circle cx="13" cy="8" r="1.6"/></svg>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><button class="dropdown-item" type="button" data-action="rename" <?= $i('action.rename') ?>><?= $t('action.rename') ?></button></li>
                            <li><button class="dropdown-item" type="button" data-action="copy-missing" <?= $i('action.copyMissing') ?>><?= $t('action.copyMissing') ?></button></li>
                            <li><button class="dropdown-item" type="button" data-action="export" <?= $i('action.export') ?>><?= $t('action.export') ?></button></li>
                            <li><button class="dropdown-item" type="button" data-action="reset" <?= $i('action.reset') ?>><?= $t('action.reset') ?></button></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><button class="dropdown-item text-danger" type="button" data-action="delete" <?= $i('action.delete') ?>><?= $t('action.delete') ?></button></li>
                        </ul>
                    </div>
                </div>
                <p class="sc-source" id="projectSource"></p>

                <div class="sc-progress" role="progressbar" id="progressBar" aria-valuemin="0" aria-valuemax="100"
                     aria-label="<?= $t('progress.aria') ?>" data-i18n-attr="aria-label:progress.aria">
                    <div class="sc-progress-fill" id="progressFill"></div>
                </div>
                <p class="sc-progress-text" id="progressText"></p>
            </div>

            <dl class="sc-stats" id="projectStats"></dl>
        </div>

        <div class="sc-warnings d-none" id="projectWarnings"></div>

        <div class="sc-toolbar">
            <input type="search" id="searchInput" class="sc-input sc-search"
                   placeholder="<?= $t('toolbar.search') ?>" aria-label="<?= $t('toolbar.search') ?>"
                   data-i18n-attr="placeholder:toolbar.search;aria-label:toolbar.search">
            <div class="sc-segment" role="group" id="statusFilter" aria-label="<?= $t('toolbar.statusAria') ?>" data-i18n-attr="aria-label:toolbar.statusAria">
                <button type="button" data-status="pending" class="is-active" <?= $i('toolbar.pending') ?>><?= $t('toolbar.pending') ?></button>
                <button type="button" data-status="all" <?= $i('toolbar.all') ?>><?= $t('toolbar.all') ?></button>
                <button type="button" data-status="done" <?= $i('toolbar.done') ?>><?= $t('toolbar.done') ?></button>
            </div>
            <select id="sortOrder" class="sc-input sc-select" aria-label="<?= $t('toolbar.sortAria') ?>" data-i18n-attr="aria-label:toolbar.sortAria">
                <option value="total-desc" <?= $i('sort.totalDesc') ?>><?= $t('sort.totalDesc') ?></option>
                <option value="total-asc" <?= $i('sort.totalAsc') ?>><?= $t('sort.totalAsc') ?></option>
                <option value="missing-desc" <?= $i('sort.missingDesc') ?>><?= $t('sort.missingDesc') ?></option>
                <option value="name-asc" <?= $i('sort.nameAsc') ?>><?= $t('sort.nameAsc') ?></option>
            </select>
        </div>

        <div class="sc-list-head" aria-hidden="true">
            <span></span><span <?= $i('list.item') ?>><?= $t('list.item') ?></span><span <?= $i('list.collected') ?>><?= $t('list.collected') ?></span><span <?= $i('list.missing') ?>><?= $t('list.missing') ?></span>
        </div>
        <ol class="sc-list" id="materialsList"></ol>
        <p class="sc-list-empty d-none" id="listEmpty"></p>
    </section>
</main>

<?php terreno(); site_rodape(); ?>

<!-- Importar -->
<div class="modal fade" id="importModal" tabindex="-1" aria-labelledby="importTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content sc-modal">
            <div class="modal-header">
                <h5 class="modal-title" id="importTitle" <?= $i('import.title') ?>><?= $t('import.title') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= $t('dialog.close') ?>" data-i18n-attr="aria-label:dialog.close"></button>
            </div>
            <div class="modal-body">
                <!-- passo 1: escolher -->
                <div id="importStepPick">
                    <label class="sc-drop" for="fileInput" id="modalDrop">
                        <strong <?= $i('import.drop') ?>><?= $t('import.drop') ?></strong>
                        <span <?= $i('import.formats') ?>><?= $t('import.formats') ?></span>
                    </label>
                    <input type="file" id="fileInput" class="visually-hidden" accept=".litematic,.schem,.schematic,.nbt,.json">
                    <p class="sc-hint" <?= $i('import.hint') ?>><?= $t('import.hint') ?></p>
                </div>

                <!-- passo 2: processando -->
                <div id="importStepBusy" class="sc-busy d-none" aria-live="polite">
                    <div class="sc-busy-bar"><span></span></div>
                    <p id="importBusyText"><?= $t('import.reading') ?></p>
                </div>

                <!-- passo 3: revisar -->
                <form id="importStepReview" class="d-none" novalidate>
                    <div class="sc-review-head">
                        <div>
                            <label for="importName" class="sc-label" <?= $i('import.name') ?>><?= $t('import.name') ?></label>
                            <input id="importName" class="sc-input" type="text" maxlength="80" required>
                        </div>
                    </div>
                    <dl class="sc-stats sc-stats-compact" id="importStats"></dl>
                    <div class="sc-warnings d-none" id="importWarnings"></div>
                    <div class="sc-preview" id="importPreview"></div>
                    <p class="sc-replace d-none" id="importReplace"></p>
                </form>

                <div class="sc-error d-none" id="importError" role="alert"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="sc-btn sc-btn-ghost" id="btnImportBack" hidden <?= $i('import.back') ?>><?= $t('import.back') ?></button>
                <button type="button" class="sc-btn sc-btn-ghost" data-bs-dismiss="modal" <?= $i('dialog.cancel') ?>><?= $t('dialog.cancel') ?></button>
                <button type="submit" class="sc-btn sc-btn-primary" form="importStepReview" id="btnImportSave" hidden <?= $i('import.save') ?>><?= $t('import.save') ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Confirmação genérica -->
<div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content sc-modal">
            <div class="modal-header">
                <h5 class="modal-title" id="confirmTitle"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= $t('dialog.close') ?>" data-i18n-attr="aria-label:dialog.close"></button>
            </div>
            <div class="modal-body">
                <p id="confirmText" class="mb-0"></p>
                <input id="confirmInput" class="sc-input mt-3 d-none" type="text" maxlength="80">
            </div>
            <div class="modal-footer">
                <button type="button" class="sc-btn sc-btn-ghost" data-bs-dismiss="modal" <?= $i('dialog.cancel') ?>><?= $t('dialog.cancel') ?></button>
                <button type="button" class="sc-btn sc-btn-primary" id="confirmOk"></button>
            </div>
        </div>
    </div>
</div>

<div class="sc-toast" id="toast" role="status" aria-live="polite">
    <span class="sc-toast-text" id="toastText"></span>
    <button type="button" class="sc-toast-undo" id="toastUndo" hidden <?= $i('toast.undo') ?>><?= $t('toast.undo') ?></button>
</div>
<div class="sc-dragcover" id="dragCover" aria-hidden="true"><span <?= $i('import.dropCover') ?>><?= $t('import.dropCover') ?></span></div>

<script>
    window.SC_I18N = <?= json_encode([
        'lang'      => $lang,
        'supported' => I18n::SUPPORTED,
        'fallback'  => I18n::FALLBACK,
        'cookie'    => I18n::COOKIE,
        'fromCookie'=> $LANG_ORIGEM === 'escolha',   // a pessoa escolheu o idioma (no site ou aqui)
        'dicts'     => I18n::all(),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?>;
</script>
<script src="./res/vendor/bootstrap/bootstrap.bundle.min.js?v=5.3.3"></script>
<script src="./res/js/i18n.js?v=<?= $assetVersion ?>"></script>
<script src="./res/js/format.js?v=<?= $assetVersion ?>"></script>
<script src="./res/js/storage.js?v=<?= $assetVersion ?>"></script>
<script src="./res/js/api.js?v=<?= $assetVersion ?>"></script>
<script src="./res/js/ui.js?v=<?= $assetVersion ?>"></script>
<script src="./res/js/app.js?v=<?= $assetVersion ?>"></script>
</body>
</html>
