// Original, photo-free line motifs drawn for the voucher's services panel.
// Coordinates use a 100-unit square and are converted to PDF's upward y axis.
function voucherServiceEllipse(x, y, rx, ry) {
 const k = 0.55228475;
 return `${x + rx} ${y} m ${x + rx} ${y + ry*k} ${x + rx*k} ${y + ry} ${x} ${y + ry} c ${x - rx*k} ${y + ry} ${x - rx} ${y + ry*k} ${x - rx} ${y} c ${x - rx} ${y - ry*k} ${x - rx*k} ${y - ry} ${x} ${y - ry} c ${x + rx*k} ${y - ry} ${x + rx} ${y - ry*k} ${x + rx} ${y} c S`;
}

const voucherServicePaths = {
 maternity: `
  38 13 m 25 10 19 22 20 35 c 20 48 12 55 18 65 c S
  39 15 m 51 17 49 29 43 36 c 41 39 45 43 50 45 c S
  39 19 m 37 31 27 34 24 43 c 20 53 22 64 24 70 c S
  36 36 m 34 45 42 49 49 49 c 57 49 63 53 68 60 c S
  49 49 m 66 45 79 55 81 69 c 83 82 72 91 56 89 c 44 87 31 79 26 68 c S
  27 43 m 33 44 35 50 36 57 c 37 63 39 67 47 69 c 55 70 62 67 68 69 c S
  28 49 m 26 63 32 76 45 81 c 57 88 69 84 74 79 c S
  47 64 m 54 59 63 58 69 63 c S
  51 66 m 57 62 63 62 68 64 c S
  75 31 m 69 25 62 32 67 38 c 69 41 72 44 75 46 c 78 43 84 38 84 34 c 84 28 78 26 75 31 c S`,
 newborn: `
  34 40 m 23 38 17 45 19 56 c 21 65 26 67 27 76 c 28 85 35 89 42 86 c 50 82 46 73 43 66 c 40 59 45 49 41 44 c 39 41 37 40 34 40 c S
  66 31 m 78 30 84 38 82 49 c 80 57 75 61 73 70 c 72 79 65 82 58 78 c 50 73 55 64 57 57 c 59 50 55 40 59 35 c 61 32 63 31 66 31 c S
  ${voucherServiceEllipse(40,32,5.7,7)}
  ${voucherServiceEllipse(28.5,31,4.6,6)}
  ${voucherServiceEllipse(20,35,3.5,4.7)}
  ${voucherServiceEllipse(14.7,41.8,2.7,3.7)}
  ${voucherServiceEllipse(13,49,2.3,3)}
  ${voucherServiceEllipse(61,22,5.7,7)}
  ${voucherServiceEllipse(72.5,22,4.6,6)}
  ${voucherServiceEllipse(81,26,3.5,4.7)}
  ${voucherServiceEllipse(86.3,33,2.7,3.7)}
  ${voucherServiceEllipse(88,40,2.3,3)}
  44 92 m 53 96 65 91 71 86 c S`,
 family: `
  ${voucherServiceEllipse(31,23,7.5,9.5)}
  ${voucherServiceEllipse(66,20,7,9)}
  26 15 m 16 17 20 29 15 36 c 12 41 15 46 20 47 c S
  25 34 m 15 39 13 54 14 66 c 15 71 20 72 22 68 c S
  35 35 m 43 38 46 47 47 54 c S
  24 40 m 25 55 21 69 18 79 c 24 83 31 84 37 81 c S
  26 83 m 25 92 l S
  35 83 m 36 92 l S
  59 32 m 52 34 48 42 47 51 c S
  72 32 m 82 36 86 49 85 65 c 85 71 79 72 77 66 c 76 58 75 50 74 43 c S
  59 37 m 57 48 58 54 59 58 c S
  76 65 m 78 92 l S
  ${voucherServiceEllipse(42,61,5.5,6.6)}
  ${voucherServiceEllipse(66,57,5.5,6.6)}
  37 70 m 31 73 31 81 32 86 c 33 89 36 88 36 84 c 36 80 l S
  47 70 m 51 73 52 79 55 80 c 58 81 60 77 61 72 c S
  38 78 m 37 92 l 42 92 l 43 84 l 45 92 l 50 92 l 48 77 l S
  62 67 m 57 69 55 74 55 80 c S
  70 67 m 75 70 77 78 76 83 c 75 87 71 86 71 81 c S
  62 75 m 58 86 l 63 86 l 63 93 l S
  69 75 m 73 86 l 68 86 l 68 93 l S`,
 wedding: `
  q 0.866 -0.5 0.5 0.866 34 58 cm
  ${voucherServiceEllipse(0,0,25,17)}
  ${voucherServiceEllipse(0,0,20,12.5)}
  Q
  q 0.94 0.342 -0.342 0.94 66 65 cm
  ${voucherServiceEllipse(0,0,25,17)}
  ${voucherServiceEllipse(0,0,20,12.5)}
  Q
  55 22 m 48 14 40 22 45 29 c 48 33 52 36 55 39 c 60 35 67 30 67 25 c 67 18 59 16 55 22 c S
  19 20 m 19 29 l 14.5 24.5 m 23.5 24.5 l S
  83 35 m 83 42 l 79.5 38.5 m 86.5 38.5 l S`,
 camera: `
  18 35 m 13 35 10 38 10 43 c 10 74 l 10 79 13 82 18 82 c 82 82 l 87 82 90 79 90 74 c 90 43 l 90 38 87 35 82 35 c 69 35 l 63 24 l 37 24 l 31 35 l h S
  17 35 m 17 29 l 27 29 l 27 35 l S
  ${voucherServiceEllipse(50,58,19,19)}
  ${voucherServiceEllipse(50,58,13.3,13.3)}
  17 43 m 26 43 l S
  77 43 m 83 43 l 83 49 l 77 49 l h S
  48 11 m 48 17 l 45 14 m 51 14 l S
  77 19 m 77 27 l 73 23 m 81 23 l S`,
};

/** Draw one service icon centred at (cx, cy), within a size × size PDF square. */
export function voucherServiceIconPdf(kind, cx, cy, size, strokeColor = '0.627 0.416 0.353') {
 if (!Object.hasOwn(voucherServicePaths, kind)) throw new Error('Unknown voucher service icon.');
 if (![cx, cy, size].every(Number.isFinite) || size <= 0) throw new Error('Invalid voucher service icon dimensions.');
 const voucherServiceScale = size / 100;
 return `q ${voucherServiceScale} 0 0 ${-voucherServiceScale} ${cx - size/2} ${cy + size/2} cm ${strokeColor} RG 1.45 w 1 J 1 j ${voucherServicePaths[kind]} Q`;
}
