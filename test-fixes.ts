import { refineLine, visualWidth } from './src/core/refiner.ts'

// Test 1: Accented characters
console.log('=== Test 1: Accented Characters ===')
const tests = [
  ['résumé', 'resume'],
  ['café', 'cafe'],
  ['señor', 'senor'],
  ['über', 'uber'],
  ['naïve', 'naive'],
  ['Ångström', 'Angstrom'],
]
let allMatch = true
for (const [accented, plain] of tests) {
  const aw = visualWidth(accented)
  const pw = visualWidth(plain)
  const match = Math.abs(aw - pw) < 0.01
  console.log(`  ${accented} (${aw.toFixed(2)}) vs ${plain} (${pw.toFixed(2)}) - ${match ? 'OK' : 'MISMATCH'}`)
  if (!match) allMatch = false
}
console.log(allMatch ? '  All accented chars OK' : '  SOME FAILED')

// Test 2: CJK detection
console.log('\n=== Test 2: CJK Detection ===')
console.log('Chinese (no merge):', refineLine('[0]你(1000,300)好(1300,300)', 0.35))
console.log('Japanese (no merge):', refineLine('[0]こ(1000,300)ん(1300,300)に(1600,300)ち(1900,300)は(2200,300)', 0.35))
console.log('Korean:', refineLine('[0]나(1000,200)는(1200,200)', 0.35, 0.08))
console.log('English:', refineLine('[0]spo(1000,500)ti(1500,500)fy(2000,500)', 0.35))

// Test 3: Special chars in refine (& and <)
console.log('\n=== Test 3: Special Characters ===')
console.log('R&B:', refineLine('[0]R&B (1000,500)music(1500,500)', 0.35))
console.log('<3:', refineLine('[0]I (1000,200)<3(1200,200)', 0.35))

// Test 4: Previous regression tests
console.log('\n=== Test 4: Regression ===')
console.log('spotify:', refineLine('[4]spo(1000,500)ti(1500,500)fy(2000,500)', 0.35))
console.log('drama,:', refineLine('[4]dra(55349,240)ma, (55589,480)', 0.35))
console.log('moonlight:', refineLine('[4]moon(65660,505)light(66165,1091)', 0.35))
console.log('midnight:', refineLine('[4]mid(61279,551)night(61830,1164)', 0.35))
console.log('alone:', refineLine('[4]a(16025,264)lone(16289,1348)', 0.35))
console.log('There/over:', refineLine('[4]There(172692,244)ov(172936,386)er, (173322,415)', 0.35))

console.log('\n=== Done ===')
