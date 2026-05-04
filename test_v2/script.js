import Packet from 'https://gyverlibs.github.io/Packet.js/Packet.min.js'
// import Packet from "../Packet.js"

// manual pack
let p = new Packet();

p.pack(3, 'u2');
p.pack(7, 'u3');
p.pack(2, 'u2');
p.pack(3.14);
p.pack("123");
p.pack([1, 2, 3], '[3]');
p.pack([1, 2, 3], '[3]u16');
p.pack([1.1, 2.2, 3.3], '[3]f');
p.pack(-123, 'i8');
p.pack(12345, 'u16');
p.pack(1233456, 'u32');
p.pack(new Uint8Array([1, 2, 3]));

let out = new Packet(p);
console.log(out.unpack("u2,u3,u2,f,'3',[3],[3]u16,[3]f,i8,u16,u32,b3"));

// array unpack
/*
const [
    cmd,
    flags,
    mode,
    temp,
    id,
    name
] = out.unpack(markup);
*/

// schema pack
const schema = Packet.schema({
    val1: 'u2',
    val2: 'u3',
    val3: 'u2',
    flt: 'f',
    str: "'3'",
    arr8: '[3]',
    arr16: '[3]u16',
    arrf: '[3]f',
});

const pp = schema.pack({
    val1: 1,
    val2: 2,
    val3: 3,
    flt: 4.4,
    str: "kek",
    arr8: [1, 2, 3],
    arr16: [4, 5, 6],
    arrf: [4.4, 5.5, 6.6],
});

console.log(schema.unpack(pp));

function test() {
    let markup = [];
    let res = [];
    let p = new Packet();

    function random(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    for (let i = 0; i < 10; i++) {
        switch (random(0, 6)) {
            case 0: {   // u bits
                let bits = random(1, 9);
                let val = random(0, 1 << bits);
                let type = 'u' + bits;
                p.pack(val, type);
                res.push(val);
                markup.push(type);
            } break;

            case 1: {   // f
                let f = new Float32Array([random(1, 100) / random(1, 100) + 0.001])[0];
                p.pack(f);
                res.push(f);
                markup.push('f');
            } break;

            case 2: {   // u bytes
                let bytes = 2 ** random(0, 3);
                let val = random(1 << ((bytes - 1) * 8), 1 << (bytes * 8));
                let type = 'u' + (bytes * 8);
                p.pack(val, type);
                res.push(val);
                markup.push(type);
            } break;

            case 3: {   // arr type
                let bytes = 2 ** random(0, 3);
                let len = random(1, 5);
                let arr = [];
                for (let i = 0; i < len; i++) {
                    arr.push(random(1 << ((bytes - 1) * 8), 1 << (bytes * 8)));
                }
                let type = '[' + len + ']u' + (bytes * 8);
                p.pack(arr, type);
                res.push(arr);
                markup.push(type);
            } break;

            case 4: {   // arr
                let len = random(1, 5);
                let arr = [];
                for (let i = 0; i < len; i++) {
                    arr.push(random(0, 256));
                }
                p.pack(arr);
                res.push(arr);
                markup.push('[' + len + ']');
            } break;

            case 5: {   // str
                let len = random(3, 10);
                let str = '';
                for (let i = 0; i < len; i++) str += 'a';
                p.pack(str);
                res.push(str);
                markup.push('"' + len + '"');
            } break;
        }
    }

    let pout = new Packet(p.buffer);
    let out = pout.unpack(markup);
    let ok = JSON.stringify(res) == JSON.stringify(out);
    if (!ok) {
        console.log("ERROR!");
        console.log(markup);
        console.log(JSON.stringify(res));
        console.log(JSON.stringify(out));
    }
}

const t0 = performance.now();
for (let i = 0; i < 300; i++) test();
console.log(performance.now() - t0);
console.log("done!");