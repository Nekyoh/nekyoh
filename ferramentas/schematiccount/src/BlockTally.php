<?php

namespace SchematicCount;

/**
 * Acumula quantos blocos existem de cada block state (nome + propriedades).
 * Os formatos de schematic só produzem isto; a conversão para itens é feita
 * depois pelo MaterialResolver, igual ao Litematica.
 */
final class BlockTally
{
    /** @var array<string, array{name:string, props:array<string,string>, count:int}> */
    private array $states = [];

    public function add(string $name, array $props, int $count): void
    {
        if ($count <= 0) {
            return;
        }
        $name = self::normalizeName($name);
        ksort($props);
        $key = $name;
        if ($props) {
            $pairs = [];
            foreach ($props as $k => $v) {
                $pairs[] = $k . '=' . $v;
            }
            $key .= '[' . implode(',', $pairs) . ']';
        }
        if (isset($this->states[$key])) {
            $this->states[$key]['count'] += $count;
        } else {
            $this->states[$key] = ['name' => $name, 'props' => $props, 'count' => $count];
        }
    }

    /** Recebe "minecraft:oak_stairs[facing=east,half=bottom]" */
    public function addStateString(string $state, int $count): void
    {
        [$name, $props] = self::parseStateString($state);
        $this->add($name, $props, $count);
    }

    /** @return array<string, array{name:string, props:array<string,string>, count:int}> */
    public function all(): array
    {
        return $this->states;
    }

    public static function parseStateString(string $state): array
    {
        $state = trim($state);
        $open = strpos($state, '[');
        if ($open === false) {
            return [$state, []];
        }
        $name = substr($state, 0, $open);
        $close = strrpos($state, ']');
        $inner = substr($state, $open + 1, ($close === false ? strlen($state) : $close) - $open - 1);
        $props = [];
        foreach (explode(',', $inner) as $part) {
            $eq = strpos($part, '=');
            if ($eq === false) {
                continue;
            }
            $k = trim(substr($part, 0, $eq));
            if ($k !== '') {
                $props[$k] = trim(substr($part, $eq + 1));
            }
        }
        return [$name, $props];
    }

    public static function normalizeName(string $name): string
    {
        $name = strtolower(trim($name));
        return str_contains($name, ':') ? $name : 'minecraft:' . $name;
    }
}
