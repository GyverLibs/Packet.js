export default class Packet {
    /**
     * @param {Uint8Array} buffer 
     */
    constructor(buffer = null) {
        this.buffer = buffer ? buffer : new Uint8Array(0);
    }

    /**
     * Парсить пакет
     * @param {String} markup "bN,f,'N',[N],[N]:bits,r" b-bytes, f-float, 'string', [array], r-raw this.buffer
     * @returns {Array | null}
     */
    parse(markup) {
        let out = [];
        let byte = 0;
        markup = markup.split(',');

        let next = (len) => {
            if (this.bit) this.bit = 0, byte++;
            return (this.buffer.length - byte >= len);
        }

        try {
            for (let x of markup) {
                let len = parseInt(x.slice(1));
                switch (x[0]) {
                    case 'b':
                        if (len < 8) {
                            if (this.bit + len > 8 && !next(1)) return null;
                            out.push((this.buffer[byte] >> this.bit) & ((1 << len) - 1));
                            this.bit += len;
                        } else {
                            let blen = len / 8;
                            if (!next(blen)) return null;
                            out.push(Packet.makeArray(this.buffer.slice(byte, byte + blen).buffer, blen)[0]);
                            byte += blen;
                        }
                        break;
                    case 'f':
                        if (!next(4)) return null;
                        out.push(new Float32Array(this.buffer.slice(byte, byte + 4).buffer)[0]);
                        byte += 4;
                        break;
                    case '\'': case '"':
                        if (!next(len)) return null;
                        out.push(new TextDecoder().decode(this.buffer.slice(byte, byte + len)));
                        byte += len;
                        break;
                    case '[': {
                        let s = x.split(':');
                        let blen = s[1] ? parseInt(s[1]) / 8 : 1;
                        if (!next(len * blen)) return null;
                        out.push(Array.from(Packet.makeArray(this.buffer.slice(byte, byte + len * blen).buffer, blen)));
                        byte += len * blen;
                    } break;
                    case 'r':
                        if (!next(len)) return null;
                        out.push(this.buffer.slice(byte, byte + len));
                        byte += len;
                        break;
                    default: return null;
                }
            }
            this.buffer = this.buffer.slice(byte, this.buffer.length);
        } catch (e) {
            console.log(e);
            return null;
        }
        return out;
    }

    /**
     * Добавить в пакет, выравнивание 1 байт
     * @param {String, Array, Number, Uint8Array} value 
     * @param {Number} size размер поля в битах для чисел и массивов
     */
    add(value, size = 0) {
        if (value instanceof Uint8Array) {
            this.#concat(value);
        } else if (typeof value === 'string') {
            this.#concat(new TextEncoder().encode(value));
        } else if (Array.isArray(value)) {
            size = size ? size / 8 : 1;
            this.#concat(new Uint8Array(Packet.makeArray(value, size).buffer, 0, value.length * size));
        } else if (!Number.isInteger(value)) {
            this.#concat(new Uint8Array(new Float32Array([value]).buffer, 0, 4));
        } else if (size >= 8) {
            this.#concat(new Uint8Array(new Uint32Array([value]).buffer, 0, size / 8));
        } else {
            if (!this.bit || this.bit + size > 8) this.#concat(new Uint8Array(1));
            this.buffer[this.buffer.length - 1] |= (value << this.bit);
            this.bit += size;
        }
    }

    static makeArray(val, len) {
        return (len == 4) ? new Uint32Array(val) : (len == 2 ? new Uint16Array(val) : new Uint8Array(val))
    }

    #concat(arr) {
        const buf = new Uint8Array(this.buffer.length + arr.length);
        buf.set(this.buffer, 0);
        buf.set(arr, this.buffer.length);
        this.buffer = buf;
        this.bit = 0;
    }

    buffer;
    bit = 0;
}