const jaro = (s, t) => {
  let [s_len, t_len] = [s.length, t.length]
  if (s_len === 0 && t_len === 0) return 1
  let matchDistance = Math.floor(Math.max(s_len, t_len) / 2) - 1
  let [sMatches, tMatches] = [Array(s_len).fill(false), Array(t_len).fill(false)] 
  let [matches, transpositions] = [0, 0]
  for (let i = 0; i < s_len; i++) {
    let start = Math.max(0, i - matchDistance)
    let end = Math.min(i + matchDistance, t_len)
    for (let j = start; j < end; j++) {
      if (tMatches[j]) continue
      if (s[i] !== t[j]) continue
      sMatches[i] = true
      tMatches[j] = true
      matches += 1
      break
    }
  }
  if (matches === 0) return 0
  let k = 0
  for (let i = 0; i < s_len; i++) {
    if (!sMatches[i]) continue
    while (!tMatches[k]) {
      k += 1
    }
    if (s[i] !== t[k]) {
      transpositions += 1
    }
    k += 1
  }

  return ((matches / s_len) + (matches / t_len) + ((matches - transpositions / 2) / matches)) / 3
}

const jaroWinkler = (str1, str2, p = 0.1) => {
  const weight = jaro(str1, str2)
  let l = 0 
  if (weight > 0.7) {
    while (str1[l] == str2[l] && l < 4) {
      l++
    }
  }
  return weight + l * p * (1 - weight)
}

const smartJaro = (a, b, func = jaro) => {
  if (func(a.slice(1), b.slice(1)) > 0.99) return true
  if (func(a, b.slice(1)) > 0.99) return true
  if (func(a.slice(1), b.slice(1)) > 0.99) return true
  let chunkDistance = func(a, b)
  if (Math.abs(a.length - b.length) >= 3) chunkDistance -=0.2
  return chunkDistance
}

const compareTwoNames = (name1, name2, straightLimit = 0.7, smartLimit = 0.96) => {
  let straightSimilarity = jaro(name1, name2)
  if (straightSimilarity > smartLimit) return true
  if (straightSimilarity < straightLimit) return false
  let minPairDistance = 1
  const [a, b] = [name1.split(/ /g), name2.split(/ /g)]
  for (let i = 0; i < a.length && i < b.length; i++) {
    const chunkDistance = smartJaro(a[i], b[i], func = jaroWinkler)
    minPairDistance = Math.min(chunkDistance, minPairDistance)
  }
  return minPairDistance > 0.88
}

const normalizeName = s => {
  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(/[.,"'’ʼ`ь-]/g, '')
  s = s.replace(/є/g, 'е').replace(/[іi]/g, 'и').replace(/конст/g, 'кост')
  return s
}

const slugifyName = s => {
  return s.replace(/ |\d+/g, '')
}

const factorial = (num, val = 1) => {
  for (let i = 2; i <= num; i++) val = val * i
  return val
}

const permutations = a => a.length ? a.reduce((r, v, i) => [ ...r, ...permutations([ ...a.slice(0, i), ...a.slice(i + 1) ]).map(x => [ v, ...x ])], []) : [[]]

const thoroughCompare = (name1, name2, maxSplits = 7) => {
  const splits = name2.split(/ /g)
  const limit = factorial(maxSplits + 1)
  for (let i = 0; i < limit; i++) {
    if (compareTwoNames(name1, splits.join(' '))) return true
  }
  return false
}

const fullCompare = (name1, name2) => {
  [name1, name2] = [normalizeName(name1), normalizeName(name2)]
  let [slugName1, slugName2] = [slugifyName(name1), slugifyName(name2)]
  if (slugName1 === slugName2) return true
  if (slugName1.indexOf(slugName2) === 0 && slugName2 >= 10) return true
  if (slugName2.indexOf(slugName1) === 0 && slugName1 >= 10) return true
  if (slugName1.lastIndexOf(slugName2) - slugName2.length === 0 && slugName2 >= 10) return true
  if (slugName2.lastIndexOf(slugName1) - slugName1.length === 0 && slugName1 >= 10) return true
  if (jaro(slugName1, slugName2) > 0.95) return true
  if (jaro(slugName2, slugName1) > 0.95) return true
  return compareTwoNames(name1, name2) ||
    compareTwoNames(name2, name1)
  return compareTwoNames(name1, name2) ||
    compareTwoNames(name2, name1) ||
    thoroughCompare(name1, name2) ||
    thoroughCompare(name2, name1)
}

const test = () => {
  const fs = require('fs')
  const testFile = fs.readFileSync('./ground_truth.csv')
  const text = testFile.toString()
  let entities = text.split(/[\n\r]+/)
  entities = entities.map(el => el.match(/(?<=")[^"]+?(?=",|"$)|[^",]+?(?=,|$)/g))
  let res = { true: { true: 0, false: 0}, false: { true: 0, false: 0 }}
  for (let entity of entities) {
    expected = entity[1] === 'TRUE'
    predicted = fullCompare(entity[2], entity[3])
    if (predicted !== expected) console.log(entity[2], entity[3])
    res[predicted + ''][expected + ''] += 1
  }
  let precision = res['true']['true'] / (res['true']['true'] + res['true']['false'])
  let recall = res['true']['true'] / (res['true']['true'] + res['false']['true'])
  let f1 = 2 * precision * recall / (precision + recall)
  console.log(precision, recall, f1)
}

