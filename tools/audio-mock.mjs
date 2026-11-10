/**
 * audio-mock.mjs — `AudioContext` tiruan untuk gerbang paritas langkah 4.
 *
 * Setiap node yang dibuat, setiap sambungan, setiap penjadwalan AudioParam, dan setiap
 * start/stop dicatat. Log lalu diringkas menjadi "sidik jari" (hitungan per jenis node +
 * multiset nilai parameter) sehingga kode live dan port kita bisa dibandingkan angka-per-angka
 * tanpa perlu menjalankan WebAudio sungguhan.
 *
 * Semua waktu diawali dari 0 (`currentTime` tetap 0 kecuali digeser manual) dan `Math.random`
 * diganti PRNG ber-seed supaya kedua sisi memakai urutan acak yang sama.
 */

export function mulberry32(seed) {
  let e = seed | 0
  return () => {
    e = (e + 1831565813) | 0
    let t = Math.imul(e ^ (e >>> 15), 1 | e)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const r6 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : v)

export function installMock({ sampleRate = 48000 } = {}) {
  const log = { nodes: [], params: [], connects: [], src: [], buffers: [] }
  let id = 0

  class Param {
    constructor(node, name) {
      this.node = node
      this.name = name
      this.value = 0
    }
    _p(method, v, t, extra = {}) {
      log.params.push({ node: this.node.id, type: this.node.kind, name: this.name, method, v: r6(v), t: r6(t), ...extra })
      return this
    }
    setValueAtTime(v, t) { this.value = v; return this._p('set', v, t) }
    linearRampToValueAtTime(v, t) { return this._p('lin', v, t) }
    exponentialRampToValueAtTime(v, t) {
      if (!(v > 0)) throw new Error(`exponentialRampToValueAtTime(${v}) — live akan melempar DOMException`)
      return this._p('exp', v, t)
    }
    setValueCurveAtTime(curve, t, d) {
      log.params.push({ node: this.node.id, type: this.node.kind, name: this.name, method: 'curve', v: r6(curve[0]), t: r6(t), d: r6(d), len: curve.length })
      return this
    }
    cancelScheduledValues(t) { return this._p('cancel', null, t) }
  }

  class Node {
    constructor(kind) {
      this.kind = kind
      this.id = ++id
      log.nodes.push({ id: this.id, kind })
    }
    connect(dst) {
      log.connects.push({ from: this.id, fromKind: this.kind, to: dst && dst.id !== undefined ? dst.id : 'destination', toKind: dst && dst.kind ? dst.kind : 'destination' })
      return dst
    }
    disconnect() {}
  }

  class Source extends Node {
    constructor(kind) { super(kind); this.buffer = null; this.loop = false }
    start(t = 0) { log.src.push({ id: this.id, kind: this.kind, op: 'start', t: r6(t) }) }
    stop(t = 0) { log.src.push({ id: this.id, kind: this.kind, op: 'stop', t: r6(t) }) }
  }

  class Osc extends Source {
    constructor() {
      super('oscillator')
      this.type = 'sine'
      this.frequency = new Param(this, 'frequency')
      this.detune = new Param(this, 'detune')
      this.onended = null
    }
  }

  class BufSrc extends Source {
    constructor() {
      super('bufferSource')
      this.playbackRate = new Param(this, 'playbackRate')
      this.onended = null
    }
  }

  const mkBuf = (channels, length, sr) => {
    const data = Array.from({ length: channels }, () => new Float32Array(length))
    const b = {
      numberOfChannels: channels,
      length,
      sampleRate: sr,
      duration: length / sr,
      getChannelData: (i) => data[i],
    }
    log.buffers.push({ channels, length, sr, sum: r6(checksum(data)) })
    return b
  }

  class Gain extends Node { constructor() { super('gain'); this.gain = new Param(this, 'gain') } }
  class Biquad extends Node {
    constructor() { super('biquad'); this.type = 'lowpass'; this.frequency = new Param(this, 'frequency'); this.Q = new Param(this, 'Q'); this.gain = new Param(this, 'gain') }
  }
  class Conv extends Node { constructor() { super('convolver'); this.buffer = null } }
  class Shaper extends Node { constructor() { super('waveShaper'); this.curve = null; this.oversample = 'none' } }
  class Comp extends Node {
    constructor() {
      super('compressor')
      for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) this[k] = new Param(this, k)
    }
  }
  class Panner extends Node { constructor() { super('stereoPanner'); this.pan = new Param(this, 'pan') } }

  class Ctx {
    constructor() {
      this.state = 'running'
      this.currentTime = 0
      this.sampleRate = sampleRate
      this.destination = { id: 0, kind: 'destination' }
    }
    resume() { this.state = 'running'; return Promise.resolve() }
    suspend() { this.state = 'suspended'; return Promise.resolve() }
    createGain() { return new Gain() }
    createOscillator() { return new Osc() }
    createBufferSource() { return new BufSrc() }
    createBiquadFilter() { return new Biquad() }
    createConvolver() { return new Conv() }
    createWaveShaper() { return new Shaper() }
    createDynamicsCompressor() { return new Comp() }
    createStereoPanner() { return new Panner() }
    createBuffer(ch, len, sr) { return mkBuf(ch, len, sr) }
  }

  const ctx = new Ctx()
  Math.random = mulberry32(0x5eed)

  globalThis.window = { AudioContext: function () { return ctx } }
  globalThis.AudioContext = function () { return ctx }
  globalThis.navigator = globalThis.navigator || {}
  globalThis.performance = globalThis.performance || { now: () => 0 }
  globalThis.Audio = function () {
    return { loop: false, volume: 1, setAttribute() {}, play: () => Promise.resolve() }
  }
  globalThis.URL.createObjectURL = () => 'blob:mock'
  globalThis.Blob = globalThis.Blob || function () {}

  return {
    ctx,
    log,
    reset(seed = 0x5eed) {
      Math.random = mulberry32(seed)
      log.nodes.length = 0
      log.params.length = 0
      log.connects.length = 0
      log.src.length = 0
      log.buffers.length = 0
    },
    /** sidik jari: hitungan node per jenis, jumlah sambungan, jumlah param per (jenis, nama, metode, nilai) */
    fingerprint() {
      const nodes = {}
      for (const n of log.nodes) nodes[n.kind] = (nodes[n.kind] || 0) + 1
      const params = {}
      for (const p of log.params) {
        const k = `${p.type}.${p.name}.${p.method}.${p.v}`
        params[k] = (params[k] || 0) + 1
      }
      return {
        nodes,
        connects: log.connects.length,
        src: log.src.length,
        paramCount: log.params.length,
        params,
        buffers: log.buffers.map((b) => `${b.channels}x${b.length}@${b.sr}:${b.sum}`),
      }
    },
  }
}

function checksum(chs) {
  let h = 0
  for (const ch of chs) {
    for (let i = 0; i < ch.length; i += 7) h = (h * 31 + Math.round(ch[i] * 1e6)) % 2147483647
  }
  return h
}
