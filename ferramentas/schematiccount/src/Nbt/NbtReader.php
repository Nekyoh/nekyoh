<?php

namespace SchematicCount\Nbt;

use SchematicCount\ImportException;

/**
 * Leitor de NBT binário (Java Edition, big-endian).
 *
 * Mapeamento de tipos:
 *   Byte/Short/Int/Long  -> int
 *   Float/Double         -> float
 *   String               -> string
 *   List                 -> array (lista)
 *   Compound             -> array associativo
 *   Byte/Int/Long Array  -> NbtArray (binário cru, lido sob demanda)
 */
final class NbtReader
{
    private const MAX_DEPTH = 512;

    private string $buf;
    private int $pos = 0;
    private int $len;

    private function __construct(string $data)
    {
        $this->buf = $data;
        $this->len = strlen($data);
    }

    /**
     * Descompacta (gzip / zlib / sem compressão) e lê o compound raiz.
     *
     * @param int $maxBytes limite do tamanho descompactado (proteção contra "zip bombs")
     */
    public static function parse(string $bytes, int $maxBytes): array
    {
        $data = self::decompress($bytes, $maxBytes);
        $reader = new self($data);

        $type = $reader->u8();
        if ($type !== 10) {
            throw new ImportException('nbt_not_compound');
        }
        $reader->string(); // nome da raiz, irrelevante

        return $reader->payload(10, 0);
    }

    public static function decompress(string $bytes, int $maxBytes): string
    {
        if (strlen($bytes) < 3) {
            throw new ImportException('file_empty');
        }

        // GZIP
        if ($bytes[0] === "\x1f" && $bytes[1] === "\x8b") {
            $out = @gzdecode($bytes, $maxBytes);
            if ($out === false) {
                throw new ImportException('gzip_failed');
            }
            return $out;
        }

        // ZLIB (0x78 0x01 / 0x5e / 0x9c / 0xda)
        if ($bytes[0] === "\x78" && in_array($bytes[1], ["\x01", "\x5e", "\x9c", "\xda"], true)) {
            $out = @gzuncompress($bytes, $maxBytes);
            if ($out !== false) {
                return $out;
            }
        }

        // Sem compressão
        if ($bytes[0] === "\x0a") {
            if (strlen($bytes) > $maxBytes) {
                throw new ImportException('file_too_big');
            }
            return $bytes;
        }

        throw new ImportException('not_nbt');
    }

    // ------------------------------------------------------------------

    private function need(int $n): void
    {
        if ($n < 0 || $this->pos + $n > $this->len) {
            throw new ImportException('nbt_corrupt');
        }
    }

    private function u8(): int
    {
        $this->need(1);
        return ord($this->buf[$this->pos++]);
    }

    private function i32(): int
    {
        $this->need(4);
        $v = unpack('N', $this->buf, $this->pos)[1];
        $this->pos += 4;
        return NbtArray::signed32($v);
    }

    private function string(): string
    {
        $this->need(2);
        $n = unpack('n', $this->buf, $this->pos)[1];
        $this->pos += 2;
        $this->need($n);
        $s = substr($this->buf, $this->pos, $n);
        $this->pos += $n;
        return $s;
    }

    private function rawArray(int $width): NbtArray
    {
        $count = $this->i32();
        if ($count < 0) {
            throw new ImportException('nbt_corrupt');
        }
        $bytes = $count * $width;
        $this->need($bytes);
        $raw = substr($this->buf, $this->pos, $bytes);
        $this->pos += $bytes;
        return new NbtArray($width, $raw, $count);
    }

    private function payload(int $type, int $depth): mixed
    {
        if ($depth > self::MAX_DEPTH) {
            throw new ImportException('nbt_corrupt');
        }

        switch ($type) {
            case 1: // Byte
                $v = $this->u8();
                return $v > 127 ? $v - 256 : $v;
            case 2: // Short
                $this->need(2);
                $v = unpack('n', $this->buf, $this->pos)[1];
                $this->pos += 2;
                return $v > 32767 ? $v - 65536 : $v;
            case 3: // Int
                return $this->i32();
            case 4: // Long
                $this->need(8);
                $v = unpack('J', $this->buf, $this->pos)[1];
                $this->pos += 8;
                return $v;
            case 5: // Float
                $this->need(4);
                $v = unpack('G', $this->buf, $this->pos)[1];
                $this->pos += 4;
                return $v;
            case 6: // Double
                $this->need(8);
                $v = unpack('E', $this->buf, $this->pos)[1];
                $this->pos += 8;
                return $v;
            case 7:
                return $this->rawArray(NbtArray::BYTE);
            case 8:
                return $this->string();
            case 9: // List
                $itemType = $this->u8();
                $count = $this->i32();
                if ($count <= 0) {
                    return [];
                }
                if ($itemType === 0 || $itemType > 12) {
                    throw new ImportException('nbt_corrupt');
                }
                $list = [];
                for ($i = 0; $i < $count; $i++) {
                    $list[] = $this->payload($itemType, $depth + 1);
                }
                return $list;
            case 10: // Compound
                $out = [];
                while (true) {
                    $t = $this->u8();
                    if ($t === 0) {
                        return $out;
                    }
                    if ($t > 12) {
                        throw new ImportException('nbt_corrupt');
                    }
                    $name = $this->string();
                    $out[$name] = $this->payload($t, $depth + 1);
                }
            case 11:
                return $this->rawArray(NbtArray::INT);
            case 12:
                return $this->rawArray(NbtArray::LONG);
        }

        throw new ImportException('nbt_corrupt');
    }
}
