//#region PWriter
export class PWriter {
    constructor(size = 64) {
        this.buf = new Uint8Array(size);
        this.len = 0;
        this.bitBuf = 0;
        this.bitLen = 0;
    }

    _grow(n) {
        if (this.len + n <= this.buf.length) return;

        let size = this.buf.length;
        while (this.len + n > size) size *= 2;

        const buf = new Uint8Array(size);
        buf.set(this.buf);
        this.buf = buf;
    }

    _byte(b) {
        this._grow(1);
        this.buf[this.len++] = b & 0xff;
    }

    endBits() {
        if (this.bitLen) {
            this._byte(this.bitBuf);
            this.bitBuf = 0;
            this.bitLen = 0;
        }
    }

    writeInt(val, bits) {
        if (this.bitLen + bits >= 32) this.endBits();

        if (!this.bitLen && (bits == 8 || bits == 16 || bits == 32)) {
            let bytes = bits / 8;
            for (let i = 0; i < bytes; i++) {
                this._byte(val >> (i * 8));
            }
        } else {
            const mask = (1 << bits) - 1;
            this.bitBuf |= (val & mask) << this.bitLen;
            this.bitLen += bits;

            while (this.bitLen >= 8) {
                this._byte(this.bitBuf);
                this.bitBuf >>>= 8;
                this.bitLen -= 8;
            }
        }
    }

    writeFloat(val) {
        this.endBits();
        const f = new Float32Array([val]);
        const u8 = new Uint8Array(f.buffer);

        this._grow(4);
        this.buf.set(u8, this.len);
        this.len += 4;
    }

    writeStr(str, size) {
        const bytes = new TextEncoder().encode(str);
        this.writeBin(bytes, size);
    }

    writeCStr(str, size) {
        this.writeStr(str, size)
        this._byte(0);
    }

    writeBin(bytes, size) {
        this.endBits();
        if (!size) size = bytes.length;
        this._grow(size);
        const wr = Math.min(bytes.length, size);
        this.buf.set(bytes.subarray(0, wr), this.len);
        this.buf.fill(0, this.len + wr, this.len + size);
        this.len += size;
    }

    writeObj(obj, schema) {
        for (const key in schema) {
            this.write(obj[key], schema[key]);
        }
    }

    write(value, type) {
        let t = type[0];
        let size = +type.slice(1);
        switch (t) {
            case 'i':
            case 'u': this.writeInt(value, size); break;
            case 'f': this.writeFloat(value); break;
            case 's': this.writeStr(value, size); break;
            case 'c': this.writeCStr(value, size); break;
            case 'b': this.writeBin(value, size); break;
        }
    }

    getBuffer() {
        this.endBits();
        return this.buf.subarray(0, this.len);
    }
}

//#region PReader
export class PReader {
    constructor(buf) {
        this.buf = buf;
        this.offs = 0;
        this.bitBuf = 0;
        this.bitLen = 0;
    }

    endBits() {
        this.bitBuf = 0;
        this.bitLen = 0;
    }

    readInt(bits, signed) {
        let v = 0;

        if (this.bitLen + bits >= 32) this.endBits();

        if (!this.bitLen && (bits == 8 || bits == 16 || bits == 32)) {
            let bytes = bits / 8;
            for (let i = 0; i < bytes; i++) {
                v |= this.buf[this.offs++] << (8 * i);
            }
        } else {
            while (this.bitLen < bits) {
                this.bitBuf |= this.buf[this.offs++] << this.bitLen;
                this.bitLen += 8;
            }
            const mask = (1 << bits) - 1;
            v = this.bitBuf & mask;
            this.bitBuf >>>= bits;
            this.bitLen -= bits;
        }

        if (!signed) return v >>> 0;

        const shift = 32 - bits;
        return (v << shift) >> shift;
    }

    readFloat() {
        this.endBits()
        const f = new Float32Array(1);
        new Uint8Array(f.buffer).set(this.buf.subarray(this.offs, this.offs + 4));
        this.offs += 4;
        return f[0];
    }

    readStr(len) {
        return new TextDecoder().decode(this.readBin(len)).split('\0')[0];
    }

    readBin(len) {
        this.endBits()
        let from = this.offs;
        this.offs += len;
        return this.buf.subarray(from, this.offs);
    }

    readObj(schema) {
        let obj = {};
        for (const key in schema) {
            obj[key] = this.read(schema[key]);
        }
        return obj;
    }

    read(type) {
        let t = type[0];
        let size = +type.slice(1);
        switch (t) {
            case 'i':
            case 'u': return this.readInt(size, t == 'i');
            case 'f': return this.readFloat();
            case 's': return this.readStr(size);
            case 'b': return this.readBin(size);
        }
    }
}