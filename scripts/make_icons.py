"""Generate the PWA icons (pure Python, no dependencies)."""
import math, struct, zlib, sys

BG_TOP = (116, 156, 150)
BG_BOT = (88, 124, 130)
WHITE = (255, 255, 255)
DOT = (255, 214, 190)


def render(size):
    ss = 3  # supersample
    rows = []
    cx = cy = size / 2
    r_mid = size * 0.27
    half_w = size * 0.035
    dot_ang = math.radians(-50)
    dx, dy = cx + r_mid * math.cos(dot_ang), cy + r_mid * math.sin(dot_ang)
    dot_r = size * 0.075
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            cov_ring = cov_dot = 0
            for sy in range(ss):
                for sx in range(ss):
                    px = x + (sx + 0.5) / ss
                    py = y + (sy + 0.5) / ss
                    d = math.hypot(px - cx, py - cy)
                    if abs(d - r_mid) <= half_w:
                        cov_ring += 1
                    if math.hypot(px - dx, py - dy) <= dot_r:
                        cov_dot += 1
            n = ss * ss
            t = y / (size - 1)
            base = tuple(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t for i in range(3))
            a_ring, a_dot = cov_ring / n, cov_dot / n
            col = tuple(base[i] * (1 - a_ring) + WHITE[i] * a_ring for i in range(3))
            col = tuple(col[i] * (1 - a_dot) + DOT[i] * a_dot for i in range(3))
            row += bytes(int(round(c)) for c in col)
        rows.append(bytes(row))
    return b"".join(rows)


def png(size, path):
    raw = render(size)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    data = b"\x89PNG\r\n\x1a\n"
    data += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    data += chunk(b"IDAT", zlib.compress(raw, 9))
    data += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(data)


if __name__ == "__main__":
    for size, name in ((180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")):
        png(size, f"icons/{name}")
        print("wrote", name, file=sys.stderr)
