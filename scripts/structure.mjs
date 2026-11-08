// Sentence structure for the colour-coded breakdown. Each word in a sentence gets a role from its
// word class and position, in the basic Chinese order:
//   Subject → When → Where → How → Verb → Object, particles at the end.
// The rules are simple on purpose; content/structure.tsv corrects the sentences they get wrong.

const CLASSES = {
  X: '谢谢 不客气 对不起 没关系 再见 喂 请问 请',
  T: '今天 明天 昨天 今年 明年 去年 现在 早上 上午 中午 下午 晚上 白天 星期天 星期日 时候',
  D: '很 也 不 都 太 真 非常 还 再 正在 有点儿 怎么 不要',
  V: '是 有 没有 想 要 去 吃 喝 来 在 见 喜欢 看 说 知道 认识 叫 买 回 到 听见 说话 做 爱 能 觉得 看见 给 听 会 住 卖 开车 穿 玩 找 问 坐 可以 读书 开 唱 睡觉 起床 写 工作 打电话 上班 下班 上学 上课 下课 读 学 学习 睡 休息 做饭 生病 看病 下雨 病 怎么样',
  A: '好 忙 高兴 多 少 早 晚 好吃 好看 好听 好玩儿 大 小 新 贵 便宜 漂亮 冷 热 对',
  NUM: '一 二 三 四 五 六 七 八 九 十 零 百 千 两 几 半 一半 多少 第',
  M: '个 本 件 口 只 些 块 元 岁 点 分 号 天 分钟 小时',
  PRT: '吗 呢 吧 了',
}
const CLASS = new Map()
for (const [c, list] of Object.entries(CLASSES)) for (const h of list.split(' ')) CLASS.set(h, c)
/** Measures that make a number a clock time or date: 五点, 八点半, 几号. */
const CLOCK = new Set(['点', '分', '号', '半'])

/** A preposition when a noun and then a verb follow: 在家吃饭, 给妈妈打电话, 到这边来. */
const PREP = { 在: 'where', 给: 'to', 到: 'where' }

/** Short codes for content/structure.tsv. */
export const CODES = { A: 'addressee', S: 'subject', W: 'when', L: 'where', H: 'how', V: 'verb', O: 'object', T: 'to', P: 'particle', X: 'phrase' }
const PARTICLE = { 吗: 'Yes/no question', 呢: 'And…?', 吧: 'Suggestion', 了: 'Done / change' }
const LABEL = { addressee: 'Talking to', subject: 'Subject', when: 'When', where: 'Where', how: 'How', object: 'Object', to: 'To', phrase: 'Set phrase' }

/** Roles for one clause, given its words' hanzi. */
function clauseRoles(hz) {
  const cls = hz.map((h, i) => {
    // 只有 "only have", 没有吃 "haven't eaten", 在做饭 "is cooking": adverbs before a verb.
    const next = CLASS.get(hz[i + 1])
    if ((h === '只' || h === '没有' || h === '在') && (next === 'V' || next === 'A')) return 'D'
    return CLASS.get(h) ?? 'N'
  })
  const n = hz.length
  const roles = new Array(n)
  const isPred = (c) => c === 'V' || c === 'A'
  const laterVerb = (i) => cls.some((c, j) => j > i + 1 && isPred(c) && !(hz[j] in PREP))
  const isPrep = (i) => hz[i] in PREP && cls[i + 1] === 'N' && laterVerb(i)
  // Number runs (五块, 八点十分, 多少钱 starts at 多少): a run starts at a number not after a number/measure.
  const runStart = (i) => cls[i] === 'NUM' && !(i > 0 && (cls[i - 1] === 'NUM' || cls[i - 1] === 'M'))
  const runEnd = (i) => { let j = i; while (j + 1 < n && (cls[j + 1] === 'NUM' || cls[j + 1] === 'M')) j++; return j }

  let p = hz.findIndex((_, i) => isPred(cls[i]) && !isPrep(i))
  if (p < 0) {
    // No verb: a number at the end is the predicate (我二十岁, 五块, 几号, 八点十分).
    const starts = hz.map((_, i) => i).filter(runStart)
    p = starts.length && starts[starts.length - 1] > 0 ? starts[starts.length - 1] : n
    for (let i = p; i < n; i++) roles[i] = cls[i] === 'PRT' ? 'particle' : 'verb'
  }
  // Clock times before the verb are "when": 我们五点见, 你几点起床.
  for (let i = 0; i < p; i++) {
    if (!runStart(i)) continue
    const e = runEnd(i)
    if (hz.slice(i, e + 1).some((h) => CLOCK.has(h))) for (let j = i; j <= e; j++) roles[j] = 'when'
  }
  let mode = null // a preposition's role carries over to its noun
  for (let i = 0; i < n; i++) {
    if (roles[i]) continue
    const c = cls[i]
    if (c === 'X') { roles[i] = 'phrase'; mode = null; continue }
    if (c === 'PRT') { roles[i] = 'particle'; mode = null; continue }
    if (isPrep(i) || (i > p && hz[i] === '在' && cls[i + 1] === 'N')) { mode = PREP[hz[i]]; roles[i] = mode; continue }
    if (mode && c === 'N') { roles[i] = mode; continue }
    mode = null
    if (c === 'T' && hz[i - 1] !== '什么') { roles[i] = 'when'; continue }
    // After the verb, a describing word before a noun belongs to the object: 好朋友, 新衣服, 很多人.
    if (i > p && c === 'A' && cls[i + 1] === 'N') { roles[i] = 'object'; continue }
    if (i > p && c === 'D' && cls[i + 1] === 'A' && cls[i + 2] === 'N') { roles[i] = 'object'; continue }
    if (c === 'D') { roles[i] = 'how'; continue }
    if (isPred(c)) { roles[i] = 'verb'; continue }
    roles[i] = i < p ? 'subject' : 'object'
  }
  // 什么时候 is one "when?"; 和 between two of the same role joins them (我和他).
  for (let i = 1; i < n; i++) if (hz[i] === '时候' && hz[i - 1] === '什么') roles[i - 1] = roles[i] = 'when'
  for (let i = 1; i < n - 1; i++) if (hz[i] === '和' && roles[i - 1] === roles[i + 1]) roles[i] = roles[i - 1]
  return roles
}

/** What a chunk is called: a verb chunk says whether it acts, describes or links. */
function label(role, hz) {
  if (role === 'particle') return PARTICLE[hz[0]] ?? 'Particle'
  if (role !== 'verb') return LABEL[role]
  // 上/下 are verbs in 上中学, 下雪 (only overrides mark them so).
  const cls = hz.map((h) => (h === '上' || h === '下' ? 'V' : CLASS.get(h)))
  if (hz.includes('是')) return 'Is'
  if (cls.includes('V')) return 'Verb'
  if (cls.includes('A')) return 'Describes'
  return 'Is' // a number or noun as the predicate: 我二十岁, 五块
}

/**
 * The breakdown: per clause, chunks of consecutive words with the same role, each with its label.
 * `override` is one role code (see CODES) per word, used instead of the rules.
 */
export function structure(zh, segment, byId, override) {
  const cs = zh.split(/[，。！？；—]+/u).map((c) => c.trim()).filter(Boolean).map(segment)
  const flat = cs.flat()
  const hanzi = (id) => byId.get(id).hanzi
  let roles
  if (override) {
    if (override.length !== flat.length) {
      throw new Error(`structure.tsv: "${zh}" splits into ${flat.length} words (${flat.map(hanzi).join(' ')}), not ${override.length}`)
    }
    roles = override.map((c) => {
      if (!CODES[c]) throw new Error(`structure.tsv: unknown role "${c}" for "${zh}" (use ${Object.keys(CODES).join(' ')})`)
      return CODES[c]
    })
  } else {
    roles = cs.flatMap((ids) => clauseRoles(ids.map(hanzi)))
  }
  let k = 0
  return cs.map((ids) => {
    const chunks = []
    for (const id of ids) {
      const role = roles[k++]
      const last = chunks[chunks.length - 1]
      // Particles and set phrases stand alone; other words merge with a neighbour of the same role.
      if (last && last.role === role && role !== 'particle' && role !== 'phrase') last.ids.push(id)
      else chunks.push({ role, ids: [id] })
    }
    return chunks.map((c) => ({ ...c, label: label(c.role, c.ids.map(hanzi)) }))
  })
}
