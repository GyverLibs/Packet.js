export default class Packet {
    /**
     * @param {Uint8Array} buffer 
     */
    constructor(buffer = null) {
        if (buffer instanceof Uint8Array) {
            this.buffer = buffer;
        } else if (buffer instanceof Packet) {
            this.buffer = buffer.buffer;
        } else if (buffer) {
            this.buffer = new Uint8Array(buffer);
        } else {
            this.buffer = new Uint8Array(0);
        }

        this._updView();
        this.bit = 0;
    }

    /**
     * Парсить пакет
     * @param {String | Array} markup "uN,iN,f,'N',[N],[N]type,bN"
     * @returns {Array | null | *} array or value if array.length == 1
     */
    unpack(markup) {
        if (typeof markup === 'string') markup = markup.split(',');

        let out = [];
        let byte = 0;
        this.bit ||= 0;

        let ensure = (len) => {
            if (this.bit) this.bit = 0, byte++;
            return byte + len <= this.buffer.length;
        }

        try {
            for (let m of markup) {
                let t = this._parseType(m);

                switch (t.kind) {
                    case 'u':
                    case 'i':
                        if (t.len < 8) {
                            if (this.bit + t.len > 8 && !ensure(1)) return null;

                            let mask = (1 << t.len) - 1;
                            let v = (this.buffer[byte] >> this.bit) & mask;

                            if (t.kind == 'i' && (v & (1 << (t.len - 1)))) {
                                v |= ~mask; // sign extend
                            }

                            out.push(v);
                            this.bit += t.len;
                        } else {
                            if (!ensure(t.bytes)) return null;
                            out.push(this._getView(this.view, t.raw, byte));
                            byte += t.bytes;
                        }
                        break;

                    case 'f':
                        if (!ensure(4)) return null;
                        out.push(this._getView(this.view, t.raw, byte));
                        byte += 4;
                        break;

                    case '\'':
                    case '"':
                        if (!ensure(t.len)) return null;
                        out.push(new TextDecoder().decode(this.buffer.subarray(byte, byte + t.len)));
                        byte += t.len;
                        break;

                    case '[': {
                        if (!ensure(t.len * t.sub.bytes)) return null;

                        let arr = [];
                        for (let i = 0; i < t.len; i++) {
                            arr.push(this._getView(this.view, t.sub.raw, byte + i * t.sub.bytes));
                        }
                        out.push(arr);
                        byte += t.len * t.sub.bytes;
                    } break;

                    case 'b':
                        if (!ensure(t.len)) return null;
                        out.push(this.buffer.subarray(byte, byte + t.len));
                        byte += t.len;
                        break;

                    default:
                        out.push(null);
                        break;
                }
            }

            this.buffer = this.buffer.subarray(byte);
            this._updView();
        } catch (e) {
            console.error(e);
            return null;
        }

        return out.length == 1 ? out[0] : out;
    }

    /**
     * Добавить в пакет, выравнивание 1 байт
     * @param {String, Array, Number, Uint8Array} value 
     * @param {String} type тип
     */
    pack(value, type) {
        let t = this._parseType(type);

        if (value instanceof Uint8Array) {
            if (t.len) {
                let buf = new Uint8Array(t.len);
                buf.set(value.subarray(0, t.len));
                value = buf;
            }
            this._append(value);

        } else if (typeof value === 'string') {
            this.pack(new TextEncoder().encode(value), t.len ? ('b' + t.len) : null);

        } else if (Array.isArray(value)) {
            if (!type) t = this._parseType(`[${value.length}]`);
            let buf = new Uint8Array(t.len * t.sub.bytes);
            let view = new DataView(buf.buffer);

            for (let i = 0; i < t.len; i++) {
                let v = i < value.length ? value[i] : 0;
                this._setView(view, t.sub.raw, i * t.sub.bytes, v);
            }

            this._append(buf);

        } else if (!Number.isInteger(value)) {
            let buf = new Uint8Array(4);
            let view = new DataView(buf.buffer);
            this._setView(view, 'f', 0, value);
            this._append(buf);

        } else if (t.len >= 8) {  // int
            let buf = new Uint8Array(t.bytes);
            let view = new DataView(buf.buffer);
            this._setView(view, type, 0, value);
            this._append(buf);

        } else {  // bit field
            if (!this.bit || this.bit + t.len > 8) this._append(new Uint8Array(1));
            let mask = (1 << t.len) - 1;
            this.buffer[this.buffer.length - 1] |= (value & mask) << this.bit;
            this.bit += t.len;
        }
    }

    /**
     * Создать схему для авто упаковки/распаковки
     * @param {Object} fields схема пакета вида имя: 'тип'
     * @returns {Object} с методами pack()/unpack()
     */
    static schema(fields) {
        let names = Object.keys(fields);
        let types = Object.values(fields);

        return {
            pack(obj) {
                let p = new Packet();
                for (let i in names) {
                    p.pack(obj[names[i]], types[i]);
                }
                return p.buffer;
            },

            unpack(buffer) {
                let p = new Packet(buffer);
                let values = p.unpack(types);
                let out = {};
                names.forEach((n, i) => out[n] = values[i]);
                return out;
            },
        };
    }

    _append(arr) {
        let buf = new Uint8Array(this.buffer.length + arr.length);
        buf.set(this.buffer, 0);
        buf.set(arr, this.buffer.length);
        this.buffer = buf;
        this._updView();
        this.bit = 0;
    }
    _setView(view, type, n, v) {
        switch (type) {
            case 'i8': view.setInt8(n, v); break;
            case 'u8': view.setUint8(n, v); break;
            case 'i16': view.setInt16(n, v, true); break;
            case 'u16': view.setUint16(n, v, true); break;
            case 'i32': view.setInt32(n, v, true); break;
            case 'u32': view.setUint32(n, v, true); break;
            case 'f': view.setFloat32(n, v, true); break;
        }
    }
    _getView(view, type, n) {
        switch (type) {
            case 'i8': return view.getInt8(n);
            case 'u8': return view.getUint8(n);
            case 'i16': return view.getInt16(n, true);
            case 'u16': return view.getUint16(n, true);
            case 'i32': return view.getInt32(n, true);
            case 'u32': return view.getUint32(n, true);
            case 'f': return view.getFloat32(n, true);
        }
        return null;
    }
    _updView() {
        this.view = new DataView(
            this.buffer.buffer,
            this.buffer.byteOffset,
            this.buffer.byteLength
        );
    }
    _parseType(type) {
        let kind = type ? type[0] : '';
        let len = (kind == 'f') ? 32 : (type ? (parseInt(type.slice(1)) || 0) : 0);
        return {
            raw: type,
            kind: kind,
            len: len,
            bytes: len >> 3,
            sub: kind == '[' ? this._parseType(type.split(']')[1] || 'u8') : undefined,
        }
    }
}