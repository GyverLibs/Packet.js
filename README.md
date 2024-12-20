# Packet.js
 
> npm i @alexgyver/packet

```js
let p = new Packet();
p.add(3, 2);
p.add(7, 3);
p.add(2, 2);
p.add(3.14);
p.add("123");
p.add(123, 8);
p.add(12345, 16);
p.add(1233456, 32);
p.add([1, 2, 3], 8);
p.add([1, 2, 3], 16);

console.log(Packet.parse(p.buffer, "b2,b3,b2,f,'3',b8,b16,b32,[3],[3]:16"));
```
