<?php

namespace SchematicCount\Nbt;

/**
 * Arrays NBT (byte / int / long) mantidos como string binária crua.
 *
 * Schematics grandes têm milhões de entradas; guardar tudo como array PHP
 * gastaria centenas de MB. Aqui os valores só são desempacotados sob demanda,
 * em blocos, por quem precisa deles.
 */
final class NbtArray
{
    public const BYTE = 1;
    public const INT  = 4;
    public const LONG = 8;

    public function __construct(
        public readonly int $width,   // bytes por elemento (1, 4 ou 8)
        public readonly string $raw,  // big-endian, como no arquivo
        public readonly int $count
    ) {
    }

    /** Elemento i como inteiro com sinal (int/long) ou byte sem sinal (0-255). */
    public function get(int $i): int
    {
        return match ($this->width) {
            self::BYTE => ord($this->raw[$i]),
            self::INT  => self::signed32(unpack('N', $this->raw, $i * 4)[1]),
            default    => unpack('J', $this->raw, $i * 8)[1],
        };
    }

    /**
     * Desempacota um trecho de longs (64 bits, com sinal do PHP) começando em $start.
     * Retorna array indexado a partir de 0.
     */
    public function longs(int $start, int $length): array
    {
        $length = max(0, min($length, $this->count - $start));
        if ($length === 0) {
            return [];
        }
        return array_values(unpack('J' . $length, $this->raw, $start * 8));
    }

    /** Todos os valores (use apenas para arrays pequenos). */
    public function toArray(): array
    {
        if ($this->count === 0) {
            return [];
        }
        if ($this->width === self::BYTE) {
            return array_values(unpack('C*', $this->raw));
        }
        if ($this->width === self::INT) {
            return array_map([self::class, 'signed32'], array_values(unpack('N*', $this->raw)));
        }
        return array_values(unpack('J*', $this->raw));
    }

    public static function signed32(int $v): int
    {
        return $v >= 0x80000000 ? $v - 0x100000000 : $v;
    }
}
