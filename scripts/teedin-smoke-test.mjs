#!/usr/bin/env node
/**
 * Teedin Smoke Test — ตรวจสอบว่าแต่ละ URL โหลดได้ (ไม่ต้องใช้ Browser MCP)
 * ใช้ได้เมื่อรัน dev server: npm run dev
 *
 * วิธีรัน: node scripts/teedin-smoke-test.mjs
 *         BASE_URL=http://localhost:3000 node scripts/teedin-smoke-test.mjs
 *
 * ผลลัพธ์: docs/teedin-test-results.json (นำเข้าใน Report HTML ได้)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// รายการเทสเรียงตามแถวใน Report (role -> [ paths สำหรับแต่ละแถว ])
// บางแถวเป็น workflow เดียวกัน (เช่น หลาย role เข้า /dashboard) จึงใช้ path เดียว
const TESTS = {
  customer: [
    { path: '/', name: 'หน้าหลัก' },
    { path: '/', name: 'Login/Register (ใช้หน้าหลัก)', expectRedirect: false },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/dashboard/favorites', name: 'Favorites' },
    { path: '/dashboard/compare', name: 'Compare' },
    { path: '/dashboard/packages', name: 'Packages' },
    { path: '/dashboard/notifications', name: 'Notifications' },
    { path: '/all-properties', name: 'All properties' },
    { path: '/all-properties', name: 'Property detail (ใช้ all-properties)', expectRedirect: false },
    { path: '/map', name: 'Map' },
    { path: '/add-property', name: 'Add property (Customer)' },
    { path: '/coming-soon', name: 'Coming soon' },
  ],
  agent: [
    { path: '/dashboard', name: 'Dashboard → agent' },
    { path: '/add-property', name: 'Add property' },
    { path: '/dashboard/listings', name: 'Listings' },
    { path: '/dashboard/listings', name: 'Property detail (ของตัวเอง)' },
    { path: '/all-properties', name: 'ติดต่อลูกค้า' },
    { path: '/add-property', name: 'Add Property Header' },
  ],
  admin: [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/super-admin-login', name: 'Super Admin login' },
    { path: '/dashboard/account', name: 'Account' },
  ],
  super_admin: [
    { path: '/super-admin-login', name: 'Login' },
    { path: '/super-admin-page?tab=dashboard', name: 'Dashboard tab' },
    { path: '/super-admin-page?tab=users', name: 'Users tab' },
    { path: '/super-admin-page?tab=properties', name: 'Properties tab' },
    { path: '/super-admin-page?tab=pending-properties', name: 'Pending tab' },
    { path: '/super-admin-page?tab=notifications', name: 'Notifications tab' },
    { path: '/super-admin-page?tab=settings', name: 'Settings tab' },
    { path: '/super-admin-login', name: 'Logout (อยู่ที่ login)' },
    { path: '/super-admin-login', name: 'Session/Security' },
  ],
};

function parseUrl(url) {
  try {
    return new URL(url, BASE_URL).href;
  } catch {
    return BASE_URL + (url.startsWith('/') ? url : '/' + url);
  }
}

async function fetchOnce(url, redirect = 'follow') {
  const fullUrl = parseUrl(url);
  try {
    const res = await fetch(fullUrl, {
      method: 'GET',
      redirect,
      headers: { 'Accept': 'text/html' },
    });
    return { ok: res.ok, status: res.status, url: res.url };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function runOne(role, item) {
  const { path } = item;
  const res = await fetchOnce(path);
  let result = 'skip';
  let note = `HTTP ${res.status}`;
  if (res.error) {
    result = 'fail';
    note = res.error;
  } else if (res.status === 200) {
    result = 'pass';
  } else if (res.status >= 300 && res.status < 400) {
    result = 'pass';
    note = `Redirect ${res.status}`;
  } else {
    result = 'fail';
  }
  return { result, note };
}

async function main() {
  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: { pass: 0, fail: 0, skip: 0 },
    results: { customer: [], agent: [], admin: [], super_admin: [] },
  };

  console.log('Teedin Smoke Test');
  console.log('Base URL:', BASE_URL);
  console.log('');

  for (const [role, items] of Object.entries(TESTS)) {
    out.results[role] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { result, note } = await runOne(role, item);
      out.results[role].push({ result, note });
      out.summary[result]++;
      const icon = result === 'pass' ? '✅' : result === 'fail' ? '❌' : '⏭️';
      console.log(`  ${icon} [${role}] ${item.name} (${item.path}) → ${result} ${note}`);
    }
  }

  const fs = await import('fs');
  const path = await import('path');
  const docsDir = path.join(process.cwd(), 'docs');
  const outPath = path.join(docsDir, 'teedin-test-results.json');
  const reportPath = path.join(docsDir, 'teedin-test-report.html');
  try { fs.mkdirSync(docsDir, { recursive: true }); } catch (_) {}
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  // ฝังผลลงใน Report HTML เพื่อโหลดอัตโนมัติเมื่อเปิดไฟล์
  try {
    let html = fs.readFileSync(reportPath, 'utf8');
    const payloadStr = JSON.stringify(out).replace(/<\/script>/gi, '\\u003c/script>');
    html = html.replace(
      /<script id="teedin-results-payload" type="application\/json">[\s\S]*?<\/script>/,
      '<script id="teedin-results-payload" type="application/json">' + payloadStr + '</script>'
    );
    fs.writeFileSync(reportPath, html, 'utf8');
    console.log('อัปเดต Report แล้ว (ผลจะโหลดอัตโนมัติเมื่อเปิด docs/teedin-test-report.html)');
  } catch (e) {
    console.warn('ไม่สามารถอัปเดต Report HTML ได้:', e.message);
  }

  console.log('');
  console.log('สรุป:', out.summary.pass, 'ผ่าน', out.summary.fail, 'ไม่ผ่าน', out.summary.skip, 'ข้าม');
  console.log('เขียนผลลัพธ์แล้ว:', outPath);
  console.log('');
  console.log('เปิด docs/teedin-test-report.html ในเบราว์เซอร์ — ผลจะโหลดเข้าไปอัตโนมัติ');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
