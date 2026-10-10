async function verifyAllApis() {
  const baseUrl = 'http://localhost:2303';
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [${total}] ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✕ [${total}] ${name}:`, e.message);
    }
  }

  console.log('\n--- TeXStudio Local API Suite Verification ---');

  // 1. System API
  await test('GET /api/system', async () => {
    const res = await fetch(`${baseUrl}/api/system`);
    const data = await res.json();
    if (!data.ok || !data.engines.pdflatex) throw new Error('System engines missing');
  });

  // 2. Projects List
  await test('GET /api/projects', async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.projects)) throw new Error('Invalid projects list');
  });

  // 3. Project Detail
  await test('GET /api/projects/default', async () => {
    const res = await fetch(`${baseUrl}/api/projects/default`);
    const data = await res.json();
    if (!data.ok || !data.project.files['main.tex']) throw new Error('Default project main.tex missing');
  });

  // 4. Snapshots Create & List
  await test('Snapshots API (/api/projects/default/snapshots)', async () => {
    // Create snapshot
    const postRes = await fetch(`${baseUrl}/api/projects/default/snapshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verification Test Snapshot',
        type: 'manual',
        files: { 'main.tex': '% Test' },
        activeFile: 'main.tex'
      })
    });
    const postData = await postRes.json();
    if (!postData.ok || !postData.snapshot) throw new Error('Failed to create snapshot');

    // List snapshots
    const listRes = await fetch(`${baseUrl}/api/projects/default/snapshots`);
    const listData = await listRes.json();
    if (!listData.ok || listData.items.length === 0) throw new Error('No snapshots returned');
  });

  // 5. Word Count
  await test('POST /api/wordcount', async () => {
    const res = await fetch(`${baseUrl}/api/wordcount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '\\section{Test}\nThis is a sample sentence with $E=mc^2$ formula.' })
    });
    const data = await res.json();
    if (data.words < 5 || data.mathFormulas !== 1) throw new Error(`Unexpected word count: ${JSON.stringify(data)}`);
  });

  // 6. Export ZIP
  await test('POST /api/export-zip', async () => {
    const res = await fetch(`${baseUrl}/api/export-zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: 'api-test',
        files: { 'main.tex': '% test content' }
      })
    });
    if (!res.ok || res.headers.get('content-type') !== 'application/zip') throw new Error('ZIP export failed');
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 50) throw new Error('Empty ZIP returned');
  });

  // 7. Git Integration API
  await test('POST /api/git (status/init)', async () => {
    const res = await fetch(`${baseUrl}/api/git`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', projectId: 'default' })
    });
    const data = await res.json();
    // Either initialized or not initialized is valid response
    if (typeof data.ok !== 'boolean') throw new Error('Invalid git response');
  });

  console.log(`\nResults: ${passed}/${total} API endpoints verified successfully!\n`);
  if (passed !== total) process.exit(1);
}

verifyAllApis();
