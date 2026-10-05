// Reuses an existing Playwright installation; no app dependency is added.
// node scripts/browser-check.mjs /absolute/path/to/playwright/index.mjs [icons]
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const {
  chromium
} = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({
  headless: true
});
try {
  if (process.argv[3] === 'icons') {
    const page = await browser.newPage({
      deviceScaleFactor: 1
    });
    const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8');
    for (const [size, name] of [[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]) {
      await page.setViewportSize({
        width: size,
        height: size
      });
      await page.setContent(`<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
      await page.screenshot({
        path: new URL(`../public/${name}`, import.meta.url).pathname
      });
    }
    console.log('Generated all three app icons from the local SVG.');
  } else {
    const context = await browser.newContext({
      viewport: {
        width: 390,
        height: 844
      },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      acceptDownloads: true,
      reducedMotion: 'reduce',
      locale: 'ko-KR'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.TEST_URL || 'http://localhost:5204/');
    async function select(label, option) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: option, exact: true }).click();
    }
    await page.getByRole('heading', {
      name: '한 장씩, 꾸준히.'
    }).waitFor();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await mkdir(new URL('../qa/', import.meta.url), {
      recursive: true
    });
    await page.screenshot({
      path: new URL('../qa/today-mobile.png', import.meta.url).pathname,
      fullPage: true
    });
    const actionBox = await page.getByRole('button', {
      name: '3장 읽기 완료',
      exact: true
    }).boundingBox();
    const navigationBox = await page.getByRole('navigation').boundingBox();
    assert.ok(actionBox.y + actionBox.height <= navigationBox.y, 'Primary completion action should fit above mobile navigation');
    await page.getByRole('button', {
      name: '3장 읽기 완료',
      exact: true
    }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bible-mobile-progress-v1')).completed.length), 3);
    await page.getByRole('button', {
      name: '되돌리기',
      exact: true
    }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bible-mobile-progress-v1')).completed.length), 0);
    await page.getByRole('button', {
      name: '읽기 기록',
      exact: true
    }).click();
    await page.getByRole('button', {
      name: '창세기 1장',
      exact: true
    }).click();
    await page.reload();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bible-mobile-progress-v1')).completed.length), 1);
    await page.getByRole('button', {
      name: '읽기 기록',
      exact: true
    }).click();
    assert.equal(await page.getByRole('button', {
      name: '창세기 1장',
      exact: true
    }).getAttribute('aria-pressed'), 'true');
    await page.getByText('이미 읽은 구간 한 번에 기록', {
      exact: true
    }).click();
    await select('읽기 끝 장', '5장');
    await page.getByRole('button', {
      name: '이 구간 5장 완료'
    }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bible-mobile-progress-v1')).completed.length), 5);
    await page.screenshot({
      path: new URL('../qa/record-mobile.png', import.meta.url).pathname,
      fullPage: true
    });
    await page.getByRole('button', {
      name: '계획·계산',
      exact: true
    }).click();
    await page.getByRole('spinbutton', {
      name: '하루 읽을 장 수'
    }).fill('4');
    await page.getByRole('button', {
      name: '목표 저장',
      exact: true
    }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bible-mobile-progress-v1')).dailyChapters), 4);
    await select('읽기 시작 위치 성경', '요한복음');
    await select('읽기 시작 위치 장', '5장');
    await page.getByRole('button', { name: '목표 저장', exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bible-mobile-progress-v1')).startChapter), '42:5');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bible-mobile-progress-v1')).completed.length), 5);
    await page.reload();
    await page.getByRole('heading', { name: '요한복음 5장', exact: true }).waitFor();
    await page.getByRole('button', { name: '4장 읽기 완료', exact: true }).click();
    await page.getByRole('heading', { name: '요한복음 9장', exact: true }).waitFor();
    await page.getByRole('button', { name: '되돌리기', exact: true }).click();
    await page.getByRole('button', { name: '시작 위치·목표 변경' }).click();
    assert.equal(await page.getByRole('button', { name: '읽기 시작 위치 장', exact: true }).textContent(), '5장');
    await page.getByRole('button', {
      name: '총 몇 장',
      exact: true
    }).click();
    await select('끝 장', '5장');
    assert.equal(await page.locator('output').textContent(), '총 5장');
    await page.getByRole('button', {
      name: '연간 회독',
      exact: true
    }).click();
    assert.equal(await page.locator('output').textContent(), '하루 4장');
    await page.screenshot({
      path: new URL('../qa/plan-mobile.png', import.meta.url).pathname,
      fullPage: true
    });
    // Long book/chapter lists stay bounded and support search and keyboard selection.
    const bookPicker = page.getByRole('button', { name: '읽기 시작 위치 성경', exact: true });
    await bookPicker.click();
    const picker = page.getByRole('dialog');
    const search = picker.getByRole('searchbox');
    await search.fill('없는성경');
    await picker.getByRole('status').getByText('일치하는 항목이 없습니다.').waitFor();
    await search.fill('시편');
    await search.press('Enter');
    assert.equal(await bookPicker.textContent(), '시편');
    assert.equal(await page.getByRole('button', { name: '읽기 시작 위치 장', exact: true }).textContent(), '1장');
    await page.getByRole('button', { name: '읽기 시작 위치 장', exact: true }).click();
    assert.equal(await picker.locator('.select-options button').count(), 150);
    assert.ok(await picker.locator('.select-options').evaluate(el => el.clientHeight <= 240 && el.scrollHeight > el.clientHeight));
    await picker.getByRole('searchbox').press('ArrowDown');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('button', { name: '읽기 시작 위치 장', exact: true }).textContent(), '150장');
    await bookPicker.click();
    await page.keyboard.press('Escape');
    assert.equal(await bookPicker.evaluate(el => el === document.activeElement), true);
    await select('읽기 시작 위치 성경', '요한복음');
    await select('읽기 시작 위치 장', '5장');
    for (const [width, height] of [[320, 568], [390, 844], [430, 844], [1024, 768], [390, 360]]) {
      await page.setViewportSize({ width, height });
      await bookPicker.click();
      const box = await picker.boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height, `Picker exceeds viewport at ${width}x${height}`);
      assert.ok(await picker.locator('.select-options').evaluate(el => el.clientHeight <= 240 && el.scrollHeight > el.clientHeight));
      if (width === 390 && height === 844) await page.screenshot({ path: new URL('../qa/book-picker-mobile.png', import.meta.url).pathname });
      await page.keyboard.press('Escape');
    }
    for (const width of [320, 390, 430, 1024]) {
      await page.setViewportSize({
        width,
        height: 844
      });
      for (const label of ['오늘', '읽기 기록', '계획·계산', '설정']) {
        await page.getByRole('button', {
          name: label,
          exact: true
        }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${label} overflows at ${width}`);
      }
    }
    await page.setViewportSize({
      width: 390,
      height: 844
    });
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', {
      name: '기록 백업하기',
      exact: true
    }).click();
    const backup = await downloaded;
    const backupData = JSON.parse(await readFile(await backup.path(), 'utf8'));
    assert.equal(backupData.completed.length, 5);
    assert.equal(backupData.startChapter, '42:5');
    page.on('dialog', d => d.accept());
    await page.locator('input[type=file]').setInputFiles({
      name: 'restore.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        ...backupData,
        completed: ['39:1']
      }))
    });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('bible-mobile-progress-v1')).completed[0] === '39:1');
    await page.locator('input[type=file]').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{broken')
    });
    await page.getByRole('status').getByText('올바른 JSON 백업 파일이 아닙니다.').waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bible-mobile-progress-v1')).completed[0]), '39:1');
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('heading', {
      name: '한 장씩, 꾸준히.'
    }).waitFor();
    await page.getByRole('button', {
      name: '4장 읽기 완료',
      exact: true
    }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bible-mobile-progress-v1')).completed.length), 5);
    await context.setOffline(false);
    // Corrupt storage must remain untouched on startup.
    await page.evaluate(() => localStorage.setItem('bible-mobile-progress-v1', 'broken-original'));
    await page.reload();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('bible-mobile-progress-v1')), 'broken-original');
    assert.deepEqual(errors, []);
    console.log('PASS: mobile record/undo/range/reload, goals, calculators, four viewport sizes, backup/restore, invalid import, offline reload/write, corrupt storage preservation, no runtime errors.');
    await context.close();
  }
} finally {
  await browser.close();
}
