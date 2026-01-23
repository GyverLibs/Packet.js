# Packet.js
 
> npm i @alexgyver/packet

`uN` - unsigned N бит
`iN` - signed N бит
`f` - float32
`'N'` - строка длиной N
`[N]` - массив u8 длиной N
`[N]type` - массив type длиной N
`bN` - массив uint8 длиной N байт

```js
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

let out = new Packet(p);
console.log(out.unpack("u2,u3,u2,f,'3',[3],[3]u16,i8,u16,u32,b3"));
```
```js
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
```