<?php

namespace SchematicCount;

/**
 * Idiomas da interface (pt, en, es).
 *
 * Os textos ficam em lang/{codigo}.json e são usados pelo PHP (para a página já abrir
 * no idioma certo, sem "piscar") e pelo JS (embutidos na página).
 *
 * Ordem para escolher o idioma:
 *   1. escolha salva no navegador (cookie "nekyoh_lang", o mesmo do site inteiro)
 *   2. idiomas do navegador (cabeçalho Accept-Language)
 *   3. inglês
 */
final class I18n
{
    public const SUPPORTED = ['pt', 'en', 'es'];
    public const FALLBACK = 'en';
    public const COOKIE = 'nekyoh_lang';   // mesmo cookie do site Nekyoh (idioma único)

    private static array $dicts = [];

    public static function dict(string $lang): array
    {
        if (!isset(self::$dicts[$lang])) {
            $file = dirname(__DIR__) . "/lang/$lang.json";
            $data = is_file($file) ? json_decode(file_get_contents($file), true) : null;
            self::$dicts[$lang] = is_array($data) ? $data : [];
        }
        return self::$dicts[$lang];
    }

    /** @return array<string, array> todos os dicionários, para embutir no JS */
    public static function all(): array
    {
        $out = [];
        foreach (self::SUPPORTED as $code) {
            $out[$code] = self::dict($code);
        }
        return $out;
    }

    public static function detect(?string $cookie, ?string $acceptLanguage): string
    {
        if ($cookie !== null && in_array($cookie, self::SUPPORTED, true)) {
            return $cookie;
        }
        return self::fromAcceptLanguage($acceptLanguage ?? '') ?? self::FALLBACK;
    }

    /** "pt-BR,pt;q=0.9,en-US;q=0.8" -> "pt" */
    public static function fromAcceptLanguage(string $header): ?string
    {
        $candidates = [];
        foreach (explode(',', $header) as $i => $part) {
            $bits = explode(';', trim($part));
            $tag = strtolower(trim($bits[0]));
            if ($tag === '' || $tag === '*') {
                continue;
            }
            $q = 1.0;
            foreach (array_slice($bits, 1) as $param) {
                if (preg_match('/^\s*q\s*=\s*([0-9.]+)\s*$/', $param, $m)) {
                    $q = (float) $m[1];
                }
            }
            if ($q <= 0) {
                continue;
            }
            // ordem estável: mesmo q, quem veio antes ganha
            $candidates[] = [$q, -$i, substr($tag, 0, 2)];
        }
        rsort($candidates);
        foreach ($candidates as [, , $primary]) {
            if (in_array($primary, self::SUPPORTED, true)) {
                return $primary;
            }
        }
        return null;
    }

    /** Texto traduzido com {variaveis}. Escapa para HTML por padrão. */
    public static function t(string $lang, string $key, array $vars = [], bool $escape = true): string
    {
        $text = self::dict($lang)[$key] ?? self::dict(self::FALLBACK)[$key] ?? $key;
        foreach ($vars as $k => $v) {
            $text = str_replace('{' . $k . '}', (string) $v, $text);
        }
        return $escape ? htmlspecialchars($text, ENT_QUOTES, 'UTF-8') : $text;
    }
}
