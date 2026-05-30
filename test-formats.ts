import { parseLys, parseQrc, parseTtml, serializeToLys, serializeToQrc, detectFormat } from './src/core/formats.ts'

const qrc = `[358,4575]Lately (358,1336)I've (1694,487)been, (2181,673)I've (2854,268)been (3122,280)losing (3402,345)sleep(3747,1186)`
console.log('detect qrc:', detectFormat(qrc))
const parsed = parseQrc(qrc)
console.log('parsed lines:', parsed.lines.length)
console.log('first token:', parsed.lines[0]?.tokens[0])
console.log('to lys:', serializeToLys(parsed.lines))
console.log('to qrc:', serializeToQrc(parsed.lines))

const lys = `[4]Lately (358,1336)I've (1694,487)been, (2181,673)`
console.log('\ndetect lys:', detectFormat(lys))
const parsedLys = parseLys(lys)
console.log('parsed lys lines:', parsedLys.lines.length)

const ttml = `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata"><head><metadata><ttm:agent type="person" xml:id="v1"/></metadata></head><body><div begin="00:00.358" end="00:04.933"><p begin="00:00.358" end="00:04.933" ttm:agent="v1" itunes:key="L1"><span begin="00:00.358" end="00:01.694">Lately </span><span begin="00:01.694" end="00:02.181">I've </span><span begin="00:02.181" end="00:02.854">been, </span></p></div></body></tt>`
console.log('\ndetect ttml:', detectFormat(ttml))
const parsedTtml = parseTtml(ttml)
console.log('parsed ttml lines:', parsedTtml.lines.length)
console.log('ttml tokens:', parsedTtml.lines[0]?.tokens)
console.log('ttml to lys:', serializeToLys(parsedTtml.lines))
