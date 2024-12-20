function test() {
    let markup = "";
    let res = [];
    let p = new Packet();

    function random(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    for (let i = 0; i < 10; i++) {
        switch (random(0, 6)) {
            case 0: {
                let bits = random(1, 9);
                let val = random(0, 1 << bits);
                p.add(val, bits);
                res.push(val);
                markup += 'b' + bits + ',';
            } break;
            case 1: {
                let f = new Float32Array([random(1, 100) / random(1, 100) + 0.001])[0];
                p.add(f);
                res.push(f);
                markup += 'f,';
            } break;
            case 2: {
                let bytes = 2 ** random(0, 3);
                let val = random(1 << ((bytes - 1) * 8), 1 << (bytes * 8));
                p.add(val, bytes * 8);
                res.push(val);
                markup += 'b' + bytes * 8 + ',';
            } break;
            case 3: {
                let bytes = 2 ** random(0, 3);
                let len = random(1, 5);
                let arr = [];
                for (let i = 0; i < len; i++) {
                    arr.push(random(1 << ((bytes - 1) * 8), 1 << (bytes * 8)));
                }
                p.add(arr, bytes * 8);
                res.push(arr);
                markup += '[' + len + ']:' + bytes * 8 + ',';
            } break;
            case 4: {
                let len = random(1, 5);
                let arr = [];
                for (let i = 0; i < len; i++) {
                    arr.push(random(0, 256));
                }
                p.add(arr, 8);
                res.push(arr);
                markup += '[' + len + '],';
            } break;
            case 5: {
                let len = random(3, 10);
                let str = '';
                for (let i = 0; i < len; i++) str += 'a';
                p.add(str);
                res.push(str);
                markup += '"' + len + '",';
            } break;
        }
    }
    markup = markup.slice(0, -1);

    let out = Packet.parse(p.buffer, markup);
    let ok = JSON.stringify(res) == JSON.stringify(out);
    if (!ok) {
        console.log("ERROR!");
        console.log(markup);
        console.log(JSON.stringify(res), JSON.stringify(out));
    }
}

for (let i = 0; i < 30; i++) test();
console.log("done!");