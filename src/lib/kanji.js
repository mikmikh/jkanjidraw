// 日

// I want to create stroke order reference file for jlpt n5 kanji
// I want to convert each stroke of kanji to sequence of directions
// The directions are:
// ul  u  ur
//   \ | /
// l - + - r
//   / | \
// dl  d  dr
// could you please write the result like this:
// 日
// d
// r,d
// r
// r
// 
// 日
// ...


export function matchStroke(directions, reference) {
    let ri = 0;
    let di = 0;
    while (ri < directions.length && di < directions.length) {
        if (directions[di] === reference[ri]) {
            ri++;
            di++;
        } else {
            di++;
        }
    }
    return ri === reference.length;
}
