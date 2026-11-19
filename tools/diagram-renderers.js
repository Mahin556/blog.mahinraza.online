// Pure Branded Vector SVG Rendering Engines (10 Layouts) for blog.mahinraza.online
(function () {
  function escXml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function wrapLines(text, maxChars) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    const words = raw.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (next.length > maxChars && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function splitItems(multiline, limit) {
    return String(multiline || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, limit || 6);
  }

  function svgHeader(state, width, height) {
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escXml(state.title)}">
  <title>${escXml(state.title)}</title>
  <defs>
    <style>
      .font-sans { font-family: Inter, 'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif; }
      .font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    </style>
    <marker id="arrow-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#0d9488" />
    </marker>
    <marker id="arrow-sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284c7" />
    </marker>
    <marker id="arrow-slate" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
    </marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
    </marker>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="#f8fafc" />
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="15" fill="none" stroke="#e2e8f0" stroke-width="2" />
  <text x="40" y="42" class="font-mono" font-size="12" font-weight="600" fill="#0f766e" letter-spacing="0.08em">${escXml(state.kicker)}</text>
  <text x="40" y="70" class="font-sans" font-size="21.5" font-weight="700" fill="#0f172a">${escXml(state.title)}</text>`;

    if (state.badge && state.badge.trim()) {
      const bText = state.badge.trim();
      const bWidth = Math.max(136, Math.round(bText.length * 8.8 + 34));
      const bx = width - 40 - bWidth;
      out += `
  <rect x="${bx}" y="38" width="${bWidth}" height="34" rx="8" fill="#0f172a" />
  <text x="${bx + bWidth / 2}" y="60" text-anchor="middle" class="font-mono" font-size="12" font-weight="700" fill="#5eead4">${escXml(bText)}</text>`;
    }
    return out;
  }

  function drawLayerBar(x, y, w, ly) {
    const hasSub = Boolean(ly.sub && ly.sub.trim());
    const h = hasSub ? 64 : 36;
    const styles = {
      teal: { fill: '#0f766e', stroke: '#0f766e', tFill: '#ffffff', sFill: '#ccfbf1' },
      sky: { fill: '#0284c7', stroke: '#0284c7', tFill: '#ffffff', sFill: '#e0f2fe' },
      notice: { fill: '#ecfdf5', stroke: '#6ee7b7', tFill: '#065f46', sFill: '#047857' },
      slate: { fill: '#e2e8f0', stroke: '#94a3b8', tFill: '#0f172a', sFill: '#475569' },
      amber: { fill: '#fffbeb', stroke: '#f59e0b', tFill: '#92400e', sFill: '#b45309' },
      dark: { fill: '#0f172a', stroke: '#0f172a', tFill: '#f8fafc', sFill: '#5eead4' }
    };
    const st = styles[ly.style] || styles.slate;
    let svg = `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${st.fill}" stroke="${st.stroke}" stroke-width="1.5" />`;
    if (hasSub) {
      svg += `
  <text x="${x + w / 2}" y="${y + 26}" text-anchor="middle" class="font-sans" font-size="14" font-weight="700" fill="${st.tFill}">${escXml(ly.title)}</text>
  <text x="${x + w / 2}" y="${y + 47}" text-anchor="middle" class="font-mono" font-size="11" fill="${st.sFill}">${escXml(ly.sub)}</text>`;
    } else {
      svg += `
  <text x="${x + w / 2}" y="${y + 23}" text-anchor="middle" class="font-mono" font-size="11.5" font-weight="600" fill="${st.tFill}">${escXml(ly.title)}</text>`;
    }
    return { svg, height: h };
  }

  // 1. PIPELINE
  function buildPipeline(state) {
    const width = 1080;
    const cols = Math.min(4, Math.max(2, Number(state.pipelineCols) || 3));
    const gapX = cols === 4 ? 26 : 38;
    const cardW = Math.floor((1000 - gapX * (cols - 1)) / cols);
    const maxChars = cols === 4 ? 26 : cols === 3 ? 36 : 54;
    const steps = (state.steps && state.steps.length) ? state.steps : [{ badge: 'STEP 1', title: 'Step', desc: '', code: '', theme: 'default' }];

    const wrapped = steps.map((st) => wrapLines(st.desc, maxChars).slice(0, 4));
    const rows = Math.ceil(steps.length / cols);
    const rowHeights = [];
    for (let r = 0; r < rows; r++) {
      let maxLines = 2;
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx < wrapped.length) maxLines = Math.max(maxLines, wrapped[idx].length);
      }
      rowHeights.push(110 + maxLines * 20 + 18);
    }

    const rowGapY = 52;
    let totalHeight = 102;
    rowHeights.forEach((rh, idx) => {
      totalHeight += rh + (idx < rowHeights.length - 1 ? rowGapY : 36);
    });

    const themes = {
      default: { border: '#cbd5e1', head: '#f0fdfa', line: '#99f6e4', badgeBg: '#0f766e', pillBg: '#f1f5f9', pillText: '#0f766e', bw: '1.75' },
      teal: { border: '#0d9488', head: '#ccfbf1', line: '#5eead4', badgeBg: '#115e59', pillBg: '#0f172a', pillText: '#5eead4', bw: '2.25' },
      sky: { border: '#38bdf8', head: '#e0f2fe', line: '#7dd3fc', badgeBg: '#0369a1', pillBg: '#f0f9ff', pillText: '#0369a1', bw: '1.75' },
      amber: { border: '#f59e0b', head: '#fef3c7', line: '#fcd34d', badgeBg: '#b45309', pillBg: '#fffbeb', pillText: '#92400e', bw: '1.75' }
    };

    let body = '';
    let curY = 102;
    for (let r = 0; r < rows; r++) {
      const cardH = rowHeights[r];
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= steps.length) break;
        const st = steps[idx];
        const th = themes[st.theme] || themes.default;
        const x = 40 + c * (cardW + gapX);
        const y = curY;
        const badgeW = Math.max(46, Math.round(String(st.badge || '').length * 7.8 + 16));

        body += `
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="#ffffff" stroke="${th.border}" stroke-width="${th.bw}" />
  <rect x="${x}" y="${y}" width="${cardW}" height="42" rx="12" fill="${th.head}" />
  <rect x="${x}" y="${y + 30}" width="${cardW}" height="12" fill="${th.head}" />
  <line x1="${x}" y1="${y + 42}" x2="${x + cardW}" y2="${y + 42}" stroke="${th.line}" stroke-width="1.25" />
  <rect x="${x + 14}" y="${y + 10}" width="${badgeW}" height="22" rx="6" fill="${th.badgeBg}" />
  <text x="${x + 14 + badgeW / 2}" y="${y + 25}" text-anchor="middle" class="font-mono" font-size="10.5" font-weight="700" fill="#ffffff">${escXml(st.badge)}</text>
  <text x="${x + 22 + badgeW}" y="${y + 26}" class="font-sans" font-size="${cols === 4 ? 12.5 : 14}" font-weight="700" fill="#0f172a">${escXml(st.title)}</text>`;

        wrapped[idx].forEach((ln, lIdx) => {
          body += `
  <text x="${x + 16}" y="${y + 68 + lIdx * 20}" class="font-sans" font-size="12.5" fill="#334155">${escXml(ln)}</text>`;
        });

        if (st.code && st.code.trim()) {
          body += `
  <rect x="${x + 16}" y="${y + cardH - 38}" width="${cardW - 32}" height="26" rx="5" fill="${th.pillBg}" />
  <text x="${x + cardW / 2}" y="${y + cardH - 21}" text-anchor="middle" class="font-mono" font-size="10.5" font-weight="600" fill="${th.pillText}">${escXml(st.code)}</text>`;
        }

        if (c < cols - 1 && idx + 1 < steps.length) {
          const ay = y + Math.round(cardH / 2);
          body += `
  <line x1="${x + cardW}" y1="${ay}" x2="${x + cardW + gapX - 6}" y2="${ay}" stroke="#0d9488" stroke-width="2.25" marker-end="url(#arrow-teal)" />`;
        }
        if (c === cols - 1 && idx + 1 < steps.length) {
          const sx = x + Math.round(cardW / 2);
          const sy = y + cardH;
          const my = sy + Math.round(rowGapY / 2);
          const tx = 40 + Math.round(cardW / 2);
          body += `
  <path d="M ${sx} ${sy} L ${sx} ${my} L ${tx} ${my} L ${tx} ${sy + rowGapY - 6}" fill="none" stroke="#0d9488" stroke-width="2" stroke-dasharray="5,4" marker-end="url(#arrow-teal)" />`;
        }
      }
      curY += cardH + rowGapY;
    }
    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  // 2. SIDE-BY-SIDE COMPARISON (2-WAY)
  function buildComparison(state) {
    const width = 1080;
    const panelW = 486;
    function sideHeight(side) {
      let h = 68;
      if (side.nodes && side.nodes.length > 0) h += 126;
      (side.layers || []).forEach((ly) => { h += (ly.sub && ly.sub.trim() ? 64 : 36) + 12; });
      if (side.footer && side.footer.trim()) h += 34;
      return h + 14;
    }
    const panelH = Math.max(sideHeight(state.left), sideHeight(state.right));
    const totalHeight = 98 + panelH + 36;

    const cardThemes = {
      teal: { stroke: '#0d9488', head: '#f0fdfa', line: '#99f6e4', tFill: '#0f766e', pBg: '#ccfbf1', pStroke: '#14b8a6', pText: '#115e59', nStroke: '#14b8a6' },
      sky: { stroke: '#38bdf8', head: '#f0f9ff', line: '#bae6fd', tFill: '#0369a1', pBg: '#e0f2fe', pStroke: '#38bdf8', pText: '#0369a1', nStroke: '#0284c7' },
      slate: { stroke: '#cbd5e1', head: '#f1f5f9', line: '#cbd5e1', tFill: '#1e293b', pBg: '#e2e8f0', pStroke: '#94a3b8', pText: '#334155', nStroke: '#94a3b8' },
      amber: { stroke: '#f59e0b', head: '#fffbeb', line: '#fde68a', tFill: '#92400e', pBg: '#fef3c7', pStroke: '#f59e0b', pText: '#92400e', nStroke: '#f59e0b' }
    };

    function drawSide(side, x0) {
      const th = cardThemes[side.theme] || cardThemes.slate;
      let s = `
  <rect x="${x0}" y="98" width="${panelW}" height="${panelH}" rx="12" fill="#ffffff" stroke="${th.stroke}" stroke-width="2" />
  <rect x="${x0}" y="98" width="${panelW}" height="48" rx="12" fill="${th.head}" />
  <rect x="${x0}" y="134" width="${panelW}" height="12" fill="${th.head}" />
  <line x1="${x0}" y1="146" x2="${x0 + panelW}" y2="146" stroke="${th.line}" stroke-width="1.5" />
  <text x="${x0 + 22}" y="128" class="font-sans" font-size="15.5" font-weight="700" fill="${th.tFill}">${escXml(side.title)}</text>`;

      if (side.pill && side.pill.trim()) {
        const pw = Math.max(116, Math.round(side.pill.length * 7.2 + 24));
        const px = x0 + panelW - 20 - pw;
        s += `
  <rect x="${px}" y="111" width="${pw}" height="22" rx="11" fill="${th.pBg}" stroke="${th.pStroke}" />
  <text x="${px + pw / 2}" y="126" text-anchor="middle" class="font-mono" font-size="10.5" font-weight="600" fill="${th.pText}">${escXml(side.pill)}</text>`;
      }

      let curY = 166;
      const innerW = panelW - 44;
      const innerX = x0 + 22;

      if (side.nodes && side.nodes.length > 0) {
        const nCount = side.nodes.length;
        const nGap = 12;
        const nW = Math.floor((innerW - nGap * (nCount - 1)) / nCount);
        side.nodes.forEach((nd, idx) => {
          const nx = innerX + idx * (nW + nGap);
          s += `
  <rect x="${nx}" y="${curY}" width="${nW}" height="108" rx="8" fill="#f8fafc" stroke="${th.nStroke}" stroke-width="1.5" />
  <text x="${nx + nW / 2}" y="${curY + 22}" text-anchor="middle" class="font-mono" font-size="11" font-weight="600" fill="${th.tFill}">${escXml(nd.name)}</text>
  <rect x="${nx + 10}" y="${curY + 32}" width="${nW - 20}" height="28" rx="4" fill="#e0f2fe" />
  <text x="${nx + nW / 2}" y="${curY + 50}" text-anchor="middle" class="font-sans" font-size="11.5" font-weight="600" fill="#0369a1">${escXml(nd.top)}</text>
  <rect x="${nx + 10}" y="${curY + 66}" width="${nW - 20}" height="28" rx="4" fill="#f1f5f9" />
  <text x="${nx + nW / 2}" y="${curY + 84}" text-anchor="middle" class="font-mono" font-size="10.5" fill="#334155">${escXml(nd.bottom)}</text>`;
        });
        curY += 124;
      }

      (side.layers || []).forEach((ly) => {
        const bar = drawLayerBar(innerX, curY, innerW, ly);
        s += bar.svg;
        curY += bar.height + 12;
      });

      if (side.footer && side.footer.trim()) {
        s += `
  <text x="${x0 + panelW / 2}" y="${98 + panelH - 18}" text-anchor="middle" class="font-sans" font-size="12" font-weight="600" fill="${th.tFill}">${escXml(side.footer)}</text>`;
      }
      return s;
    }

    const body = drawSide(state.left, 40) + drawSide(state.right, 554);
    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  // 3. THREE-WAY COMPARISON MATRIX (A vs B vs C)
  function buildThreeWay(state) {
    const width = 1080;
    const cols = (state.columns || []).slice(0, 3);
    while (cols.length < 3) {
      cols.push({ title: 'Option', pill: 'Tag', theme: 'slate', items: 'Feature 1\nFeature 2', metric: 'Metric', footer: '' });
    }
    const parsedItems = cols.map((c) => splitItems(c.items, 6));
    const maxRows = Math.max(2, ...parsedItems.map((a) => a.length));
    const cardW = 318;
    const gap = 23;
    const cardH = 88 + maxRows * 40 + 88;
    const totalHeight = 100 + cardH + 36;

    const themes = {
      teal: { stroke: '#0d9488', head: '#f0fdfa', line: '#99f6e4', title: '#0f766e', pillBg: '#ccfbf1', pillText: '#115e59', metricBg: '#0f766e', metricText: '#ffffff' },
      sky: { stroke: '#38bdf8', head: '#f0f9ff', line: '#bae6fd', title: '#0369a1', pillBg: '#e0f2fe', pillText: '#0369a1', metricBg: '#0284c7', metricText: '#ffffff' },
      slate: { stroke: '#cbd5e1', head: '#f1f5f9', line: '#cbd5e1', title: '#1e293b', pillBg: '#e2e8f0', pillText: '#334155', metricBg: '#0f172a', metricText: '#5eead4' },
      amber: { stroke: '#f59e0b', head: '#fffbeb', line: '#fde68a', title: '#92400e', pillBg: '#fef3c7', pillText: '#92400e', metricBg: '#d97706', metricText: '#ffffff' }
    };

    let body = '';
    cols.forEach((col, idx) => {
      const x = 40 + idx * (cardW + gap);
      const y = 100;
      const th = themes[col.theme] || themes.slate;
      body += `
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="#ffffff" stroke="${th.stroke}" stroke-width="2" />
  <rect x="${x}" y="${y}" width="${cardW}" height="64" rx="12" fill="${th.head}" />
  <rect x="${x}" y="${y + 50}" width="${cardW}" height="14" fill="${th.head}" />
  <line x1="${x}" y1="${y + 64}" x2="${x + cardW}" y2="${y + 64}" stroke="${th.line}" stroke-width="1.5" />
  <text x="${x + cardW / 2}" y="${y + 28}" text-anchor="middle" class="font-sans" font-size="15.5" font-weight="700" fill="${th.title}">${escXml(col.title)}</text>
  <rect x="${x + 64}" y="${y + 36}" width="${cardW - 128}" height="20" rx="10" fill="${th.pillBg}" />
  <text x="${x + cardW / 2}" y="${y + 50}" text-anchor="middle" class="font-mono" font-size="10" font-weight="600" fill="${th.pillText}">${escXml(col.pill)}</text>`;

      parsedItems[idx].forEach((item, rIdx) => {
        const iy = y + 80 + rIdx * 40;
        const isBottom = rIdx === parsedItems[idx].length - 1;
        body += `
  <rect x="${x + 18}" y="${iy}" width="${cardW - 36}" height="32" rx="6" fill="${isBottom ? '#e2e8f0' : '#f8fafc'}" stroke="#cbd5e1" />
  <text x="${x + cardW / 2}" y="${iy + 20}" text-anchor="middle" class="font-sans" font-size="12" font-weight="${isBottom ? '700' : '500'}" fill="#1e293b">${escXml(item)}</text>`;
      });

      const my = y + cardH - 72;
      body += `
  <rect x="${x + 18}" y="${my}" width="${cardW - 36}" height="30" rx="6" fill="${th.metricBg}" />
  <text x="${x + cardW / 2}" y="${my + 19}" text-anchor="middle" class="font-mono" font-size="11" font-weight="700" fill="${th.metricText}">${escXml(col.metric)}</text>
  <text x="${x + cardW / 2}" y="${y + cardH - 18}" text-anchor="middle" class="font-sans" font-size="11.5" font-weight="600" fill="${th.title}">${escXml(col.footer)}</text>`;
    });

    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  // 4. MULTI-NODE CLUSTER STACK
  function buildStack(state) {
    const width = 1080;
    const nodes = (state.nodes && state.nodes.length) ? state.nodes : [{ name: 'Node 1', pills: 'Service A', spec: '2 vCPU', theme: 'teal' }];
    const nCount = nodes.length;
    const gap = 18;
    const innerW = 1000;
    const nodeW = Math.floor((innerW - gap * (nCount - 1)) / nCount);
    const parsedPills = nodes.map((nd) => splitItems(nd.pills, 5));
    const maxPills = Math.max(1, ...parsedPills.map((p) => p.length));
    const nodeH = 54 + maxPills * 34 + 28;

    let curY = 102;
    let body = '';
    const nodeThemes = {
      teal: { head: '#0f766e', border: '#14b8a6' },
      sky: { head: '#0369a1', border: '#38bdf8' },
      dark: { head: '#0f172a', border: '#64748b' }
    };

    nodes.forEach((nd, idx) => {
      const nx = 40 + idx * (nodeW + gap);
      const nth = nodeThemes[nd.theme] || nodeThemes.teal;
      body += `
  <rect x="${nx}" y="${curY}" width="${nodeW}" height="${nodeH}" rx="10" fill="#ffffff" stroke="${nth.border}" stroke-width="1.75" />
  <rect x="${nx}" y="${curY}" width="${nodeW}" height="32" rx="10" fill="${nth.head}" />
  <rect x="${nx}" y="${curY + 20}" width="${nodeW}" height="12" fill="${nth.head}" />
  <text x="${nx + nodeW / 2}" y="${curY + 21}" text-anchor="middle" class="font-mono" font-size="11.5" font-weight="600" fill="#ffffff">${escXml(nd.name)}</text>`;

      parsedPills[idx].forEach((pText, pIdx) => {
        const py = curY + 44 + pIdx * 34;
        const isFirst = pIdx === 0;
        body += `
  <rect x="${nx + 14}" y="${py}" width="${nodeW - 28}" height="28" rx="5" fill="${isFirst ? '#ecfdf5' : '#f1f5f9'}" stroke="${isFirst ? '#6ee7b7' : '#cbd5e1'}" />
  <text x="${nx + nodeW / 2}" y="${py + 18}" text-anchor="middle" class="font-sans" font-size="11.5" font-weight="600" fill="${isFirst ? '#065f46' : '#334155'}">${escXml(pText)}</text>`;
      });

      if (nd.spec && nd.spec.trim()) {
        body += `
  <text x="${nx + nodeW / 2}" y="${curY + nodeH - 11}" text-anchor="middle" class="font-mono" font-size="10" fill="#64748b">${escXml(nd.spec)}</text>`;
      }
      if (state.layers && state.layers.length > 0) {
        const cx = nx + Math.round(nodeW / 2);
        body += `
  <line x1="${cx}" y1="${curY + nodeH}" x2="${cx}" y2="${curY + nodeH + 22}" stroke="#0d9488" stroke-width="1.75" marker-end="url(#arrow-teal)" />`;
      }
    });

    curY += nodeH + 28;
    (state.layers || []).forEach((ly) => {
      const bar = drawLayerBar(40, curY, innerW, ly);
      body += bar.svg;
      curY += bar.height + 12;
    });
    const totalHeight = curY + 24;
    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  // 5. 3-COLUMN HUB / GATEWAY FLOW
  function buildHub(state) {
    const width = 1080;
    const leftCards = (state.leftCards && state.leftCards.length) ? state.leftCards : [{ title: 'Source', sub: '', code: '' }];
    const rightCards = (state.rightCards && state.rightCards.length) ? state.rightCards : [{ title: 'Target', sub: '', code: '' }];
    const maxSideCount = Math.max(leftCards.length, rightCards.length);
    const cardH = 88;
    const cardGap = 14;
    const colContentH = maxSideCount * cardH + (maxSideCount - 1) * cardGap;
    const startY = 136;
    const totalHeight = Math.max(420, startY + colContentH + 44);

    const colW = 286;
    const leftX = 40;
    const centerX = 397;
    const rightX = 754;

    let body = `
  <text x="${leftX}" y="118" class="font-mono" font-size="11.5" font-weight="700" fill="#0f766e">${escXml(state.leftHeader)}</text>
  <text x="${rightX}" y="118" class="font-mono" font-size="11.5" font-weight="700" fill="#0369a1">${escXml(state.rightHeader)}</text>`;

    function drawMiniCard(c, x, y, strokeColor) {
      return `
  <rect x="${x}" y="${y}" width="${colW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.75" />
  <text x="${x + 16}" y="${y + 26}" class="font-sans" font-size="13.5" font-weight="700" fill="#0f172a">${escXml(c.title)}</text>
  <text x="${x + 16}" y="${y + 46}" class="font-sans" font-size="11.5" fill="#475569">${escXml(c.sub)}</text>
  <rect x="${x + 16}" y="${y + 56}" width="${colW - 32}" height="22" rx="4" fill="#f1f5f9" />
  <text x="${x + colW / 2}" y="${y + 71}" text-anchor="middle" class="font-mono" font-size="10" font-weight="600" fill="#0f766e">${escXml(c.code)}</text>`;
    }

    const hubH = 186;
    const hubY = startY + Math.max(0, Math.round((colContentH - hubH) / 2));
    const hubCenterY = hubY + Math.round(hubH / 2);
    const hubLines = wrapLines(state.centerSub, 32).slice(0, 4);

    body += `
  <rect x="${centerX}" y="${hubY}" width="${colW}" height="${hubH}" rx="14" fill="#0f766e" />
  <text x="${centerX + colW / 2}" y="${hubY + 36}" text-anchor="middle" class="font-sans" font-size="15.5" font-weight="700" fill="#ffffff">${escXml(state.centerTitle)}</text>`;
    hubLines.forEach((ln, idx) => {
      body += `
  <text x="${centerX + colW / 2}" y="${hubY + 64 + idx * 19}" text-anchor="middle" class="font-sans" font-size="12" fill="#ccfbf1">${escXml(ln)}</text>`;
    });
    if (state.centerCode && state.centerCode.trim()) {
      body += `
  <rect x="${centerX + 22}" y="${hubY + hubH - 42}" width="${colW - 44}" height="26" rx="6" fill="#0f172a" />
  <text x="${centerX + colW / 2}" y="${hubY + hubH - 25}" text-anchor="middle" class="font-mono" font-size="11" font-weight="600" fill="#5eead4">${escXml(state.centerCode)}</text>`;
    }

    leftCards.forEach((c, idx) => {
      const cy = startY + idx * (cardH + cardGap);
      body += drawMiniCard(c, leftX, cy, '#14b8a6');
      const yMid = cy + Math.round(cardH / 2);
      body += `
  <path d="M ${leftX + colW} ${yMid} C ${leftX + colW + 34} ${yMid}, ${centerX - 34} ${hubCenterY}, ${centerX - 6} ${hubCenterY}" fill="none" stroke="#0d9488" stroke-width="2" marker-end="url(#arrow-teal)" />`;
    });

    rightCards.forEach((c, idx) => {
      const cy = startY + idx * (cardH + cardGap);
      body += drawMiniCard(c, rightX, cy, '#38bdf8');
      const yMid = cy + Math.round(cardH / 2);
      body += `
  <path d="M ${centerX + colW} ${hubCenterY} C ${centerX + colW + 34} ${hubCenterY}, ${rightX - 34} ${yMid}, ${rightX - 6} ${yMid}" fill="none" stroke="#0d9488" stroke-width="2" marker-end="url(#arrow-teal)" />`;
    });

    if (state.leftArrow && state.leftArrow.trim()) {
      body += `
  <rect x="${leftX + colW + 10}" y="${hubCenterY - 28}" width="54" height="20" rx="10" fill="#ccfbf1" />
  <text x="${leftX + colW + 37}" y="${hubCenterY - 14}" text-anchor="middle" class="font-mono" font-size="9.5" font-weight="700" fill="#115e59">${escXml(state.leftArrow)}</text>`;
    }
    if (state.rightArrow && state.rightArrow.trim()) {
      body += `
  <rect x="${centerX + colW + 10}" y="${hubCenterY - 28}" width="54" height="20" rx="10" fill="#e0f2fe" />
  <text x="${centerX + colW + 37}" y="${hubCenterY - 14}" text-anchor="middle" class="font-mono" font-size="9.5" font-weight="700" fill="#0369a1">${escXml(state.rightArrow)}</text>`;
    }
    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  // 6. SEQUENCE DIAGRAM (Request / Response Lifelines)
  function buildSequence(state) {
    const width = 1080;
    const actors = (state.actors && state.actors.length >= 2) ? state.actors.slice(0, 5) : ['Client', 'Server'];
    const msgs = (state.messages && state.messages.length) ? state.messages : [{ from: 0, to: 1, label: 'Request', code: '', dashed: false }];
    const n = actors.length;
    const usableW = 960;
    const stepX = Math.floor(usableW / (n - 1));
    const actorX = actors.map((_, i) => 60 + (n === 1 ? 480 : Math.min(usableW - 120, i * Math.floor((1080 - 240) / (n - 1))) + 60));

    // Recompute symmetric actor centers across [130 .. 950]
    const centers = actors.map((_, i) => Math.round(130 + (i * 820) / Math.max(1, n - 1)));
    const boxW = Math.min(184, Math.floor(760 / n));
    const startMsgY = 178;
    const msgGap = 62;
    const lifelineEndY = startMsgY + msgs.length * msgGap + 12;
    const totalHeight = lifelineEndY + 68;

    let body = '';
    // Lifelines + Top & Bottom Actor Boxes
    actors.forEach((act, idx) => {
      const cx = centers[idx];
      const bx = cx - Math.round(boxW / 2);
      const isEdge = idx === 0;
      body += `
  <line x1="${cx}" y1="144" x2="${cx}" y2="${lifelineEndY}" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6,5" />
  <rect x="${bx}" y="102" width="${boxW}" height="42" rx="8" fill="${isEdge ? '#0f172a' : '#0f766e'}" />
  <text x="${cx}" y="128" text-anchor="middle" class="font-sans" font-size="13" font-weight="700" fill="#ffffff">${escXml(act)}</text>
  <rect x="${bx}" y="${lifelineEndY}" width="${boxW}" height="34" rx="7" fill="#e2e8f0" stroke="#cbd5e1" />
  <text x="${cx}" y="${lifelineEndY + 21}" text-anchor="middle" class="font-mono" font-size="11" font-weight="600" fill="#334155">${escXml(act)}</text>`;
    });

    // Horizontal Messages
    msgs.forEach((m, idx) => {
      const fIdx = Math.max(0, Math.min(n - 1, Number(m.from) || 0));
      const tIdx = Math.max(0, Math.min(n - 1, Number(m.to) || 0));
      const x1 = centers[fIdx];
      const x2 = centers[tIdx];
      const y = startMsgY + idx * msgGap;
      const dir = x2 >= x1 ? 1 : -1;
      const targetX = x1 === x2 ? x1 + 60 : x2 - dir * 6;
      const midX = Math.round((x1 + x2) / 2);
      const dashAttr = m.dashed ? ' stroke-dasharray="6,4"' : '';
      const strokeCol = m.dashed ? '#0284c7' : '#0d9488';
      const marker = m.dashed ? 'url(#arrow-sky)' : 'url(#arrow-teal)';

      body += `
  <circle cx="${x1}" cy="${y}" r="4" fill="${strokeCol}" />
  <line x1="${x1}" y1="${y}" x2="${targetX}" y2="${y}" stroke="${strokeCol}" stroke-width="2.25"${dashAttr} marker-end="${marker}" />
  <rect x="${midX - 150}" y="${y - 24}" width="300" height="19" rx="4" fill="#f8fafc" />
  <text x="${midX}" y="${y - 10}" text-anchor="middle" class="font-sans" font-size="12" font-weight="700" fill="#0f172a">${escXml(m.label)}</text>`;

      if (m.code && m.code.trim()) {
        const cw = Math.min(340, Math.max(150, Math.round(m.code.length * 6.8 + 20)));
        body += `
  <rect x="${midX - Math.round(cw / 2)}" y="${y + 6}" width="${cw}" height="19" rx="4" fill="#f1f5f9" stroke="#e2e8f0" />
  <text x="${midX}" y="${y + 19}" text-anchor="middle" class="font-mono" font-size="10" fill="#0f766e">${escXml(m.code)}</text>`;
      }
    });

    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  // 7. HIERARCHY / ROUTING TREE (Top-Down)
  function buildTree(state) {
    const width = 1080;
    const root = state.root || { title: 'Root Node', sub: '', code: '' };
    const branches = (state.branches && state.branches.length) ? state.branches.slice(0, 4) : [{ title: 'Branch 1', sub: '', theme: 'teal', leaves: ['Leaf 1'] }];
    const bCount = branches.length;
    const gap = 20;
    const bW = Math.floor((1000 - gap * (bCount - 1)) / bCount);

    const parsedLeaves = branches.map((b) => Array.isArray(b.leaves) ? b.leaves : splitItems(b.leaves, 4));
    const maxLeaves = Math.max(1, ...parsedLeaves.map((l) => l.length));
    const totalHeight = 320 + maxLeaves * 48 + 40;

    // Root box
    const rootW = 560;
    const rootX = Math.round((width - rootW) / 2);
    let body = `
  <rect x="${rootX}" y="100" width="${rootW}" height="82" rx="12" fill="#0f172a" />
  <text x="540" y="128" text-anchor="middle" class="font-sans" font-size="15" font-weight="700" fill="#ffffff">${escXml(root.title)}</text>
  <text x="540" y="148" text-anchor="middle" class="font-sans" font-size="11.5" fill="#cbd5e1">${escXml(root.sub)}</text>
  <text x="540" y="168" text-anchor="middle" class="font-mono" font-size="10.5" font-weight="600" fill="#5eead4">${escXml(root.code)}</text>`;

    const busY = 206;
    body += `\n  <line x1="540" y1="182" x2="540" y2="${busY}" stroke="#0d9488" stroke-width="2.25" />`;

    const firstCenter = 40 + Math.round(bW / 2);
    const lastCenter = 40 + (bCount - 1) * (bW + gap) + Math.round(bW / 2);
    if (bCount > 1) {
      body += `\n  <line x1="${firstCenter}" y1="${busY}" x2="${lastCenter}" y2="${busY}" stroke="#0d9488" stroke-width="2.25" />`;
    }

    const bThemes = {
      teal: { fill: '#f0fdfa', stroke: '#0d9488', title: '#0f766e' },
      sky: { fill: '#f0f9ff', stroke: '#0284c7', title: '#0369a1' },
      amber: { fill: '#fffbeb', stroke: '#d97706', title: '#92400e' },
      slate: { fill: '#f1f5f9', stroke: '#64748b', title: '#1e293b' }
    };

    branches.forEach((b, idx) => {
      const bx = 40 + idx * (bW + gap);
      const cx = bx + Math.round(bW / 2);
      const th = bThemes[b.theme] || bThemes.teal;
      body += `
  <line x1="${cx}" y1="${busY}" x2="${cx}" y2="230" stroke="#0d9488" stroke-width="2" marker-end="url(#arrow-teal)" />
  <rect x="${bx}" y="236" width="${bW}" height="62" rx="10" fill="${th.fill}" stroke="${th.stroke}" stroke-width="1.75" />
  <text x="${cx}" y="262" text-anchor="middle" class="font-mono" font-size="12.5" font-weight="700" fill="${th.title}">${escXml(b.title)}</text>
  <text x="${cx}" y="282" text-anchor="middle" class="font-sans" font-size="11.5" fill="#475569">${escXml(b.sub)}</text>`;

      parsedLeaves[idx].forEach((lf, lIdx) => {
        const ly = 320 + lIdx * 48;
        body += `
  <line x1="${cx}" y1="${lIdx === 0 ? 298 : ly - 12}" x2="${cx}" y2="${ly - 2}" stroke="#94a3b8" stroke-width="1.5" />
  <rect x="${bx + 10}" y="${ly}" width="${bW - 20}" height="36" rx="7" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="${cx}" y="${ly + 22}" text-anchor="middle" class="font-mono" font-size="10.5" font-weight="500" fill="#1e293b">${escXml(lf)}</text>`;
      });
    });

    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  // 8. INCIDENT / LIFECYCLE TIMELINE
  function buildTimeline(state) {
    const width = 1080;
    const events = (state.events && state.events.length) ? state.events : [{ time: 'T+0m', badge: 'START', title: 'Event', desc: '', code: '', theme: 'teal' }];
    const cardH = 98;
    const gapY = 18;
    const startY = 106;
    const totalHeight = startY + events.length * (cardH + gapY) + 24;

    const railX = 228;
    let body = `
  <line x1="${railX}" y1="${startY + 20}" x2="${railX}" y2="${totalHeight - 54}" stroke="#0d9488" stroke-width="3" />`;

    const themes = {
      teal: { dot: '#0d9488', badgeBg: '#ccfbf1', badgeText: '#115e59', border: '#14b8a6' },
      sky: { dot: '#0284c7', badgeBg: '#e0f2fe', badgeText: '#0369a1', border: '#38bdf8' },
      amber: { dot: '#d97706', badgeBg: '#fef3c7', badgeText: '#92400e', border: '#f59e0b' },
      slate: { dot: '#475569', badgeBg: '#e2e8f0', badgeText: '#1e293b', border: '#94a3b8' }
    };

    events.forEach((ev, idx) => {
      const y = startY + idx * (cardH + gapY);
      const midY = y + Math.round(cardH / 2);
      const th = themes[ev.theme] || themes.teal;
      const cardX = 264;
      const cardW = 776;
      const bw = Math.max(76, Math.round(String(ev.badge || '').length * 7.8 + 20));

      body += `
  <rect x="40" y="${midY - 16}" width="164" height="32" rx="8" fill="#0f172a" />
  <text x="122" y="${midY + 4}" text-anchor="middle" class="font-mono" font-size="11" font-weight="700" fill="#5eead4">${escXml(ev.time)}</text>
  <circle cx="${railX}" cy="${midY}" r="8" fill="#ffffff" stroke="${th.dot}" stroke-width="4" />
  <line x1="${railX + 8}" y1="${midY}" x2="${cardX}" y2="${midY}" stroke="${th.dot}" stroke-width="2" />
  <rect x="${cardX}" y="${y}" width="${cardW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${th.border}" stroke-width="1.75" />
  <rect x="${cardX + 18}" y="${y + 14}" width="${bw}" height="22" rx="5" fill="${th.badgeBg}" />
  <text x="${cardX + 18 + bw / 2}" y="${y + 29}" text-anchor="middle" class="font-mono" font-size="10.5" font-weight="700" fill="${th.badgeText}">${escXml(ev.badge)}</text>
  <text x="${cardX + 28 + bw}" y="${y + 30}" class="font-sans" font-size="14.5" font-weight="700" fill="#0f172a">${escXml(ev.title)}</text>
  <text x="${cardX + 18}" y="${y + 56}" class="font-sans" font-size="12.5" fill="#334155">${escXml(ev.desc)}</text>`;

      if (ev.code && ev.code.trim()) {
        body += `
  <rect x="${cardX + 18}" y="${y + 66}" width="${cardW - 36}" height="22" rx="4" fill="#f1f5f9" />
  <text x="${cardX + 28}" y="${y + 81}" class="font-mono" font-size="10.5" font-weight="600" fill="#0f766e">${escXml(ev.code)}</text>`;
      }
    });

    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  // 9. DECISION FLOWCHART / TROUBLESHOOTING TREE
  function buildDecision(state) {
    const width = 1080;
    const checks = (state.checks && state.checks.length) ? state.checks : [{ condition: 'Check 1?', yesTitle: 'Fix', yesDesc: '', yesCode: '', noLabel: 'No -> Next' }];
    const rowH = 114;
    const gapY = 30;
    const startY = 176;
    const finalY = startY + checks.length * (rowH + gapY);
    const totalHeight = finalY + 86;

    // Symptom Trigger Banner
    let body = `
  <rect x="40" y="102" width="520" height="44" rx="10" fill="#0f172a" />
  <text x="300" y="129" text-anchor="middle" class="font-sans" font-size="13.5" font-weight="700" fill="#5eead4">${escXml(state.trigger)}</text>
  <line x1="300" y1="146" x2="300" y2="${startY - 6}" stroke="#0d9488" stroke-width="2.25" marker-end="url(#arrow-teal)" />`;

    checks.forEach((chk, idx) => {
      const y = startY + idx * (rowH + gapY);
      const midY = y + Math.round(rowH / 2);
      const condLines = wrapLines(chk.condition, 42).slice(0, 2);

      // Left Condition Card
      body += `
  <rect x="40" y="${y}" width="520" height="${rowH}" rx="12" fill="#f0fdfa" stroke="#0d9488" stroke-width="2" />
  <rect x="56" y="${y + 14}" width="84" height="20" rx="5" fill="#0f766e" />
  <text x="98" y="${y + 28}" text-anchor="middle" class="font-mono" font-size="10" font-weight="700" fill="#ffffff">CHECK #${idx + 1}</text>`;
      condLines.forEach((ln, lIdx) => {
        body += `
  <text x="56" y="${y + 58 + lIdx * 21}" class="font-sans" font-size="14" font-weight="700" fill="#0f172a">${escXml(ln)}</text>`;
      });

      // YES Arrow -> Right Action Card
      body += `
  <line x1="560" y1="${midY}" x2="626" y2="${midY}" stroke="#0d9488" stroke-width="2.25" marker-end="url(#arrow-teal)" />
  <rect x="572" y="${midY - 22}" width="44" height="18" rx="9" fill="#ccfbf1" />
  <text x="594" y="${midY - 9}" text-anchor="middle" class="font-mono" font-size="9.5" font-weight="700" fill="#065f46">YES</text>
  <rect x="632" y="${y}" width="408" height="${rowH}" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.75" />
  <text x="650" y="${y + 28}" class="font-sans" font-size="14" font-weight="700" fill="#0f766e">${escXml(chk.yesTitle)}</text>`;

      wrapLines(chk.yesDesc, 48).slice(0, 2).forEach((ln, lIdx) => {
        body += `
  <text x="650" y="${y + 50 + lIdx * 18}" class="font-sans" font-size="12" fill="#334155">${escXml(ln)}</text>`;
      });

      if (chk.yesCode && chk.yesCode.trim()) {
        body += `
  <rect x="650" y="${y + rowH - 32}" width="372" height="22" rx="4" fill="#f1f5f9" />
  <text x="836" y="${y + rowH - 17}" text-anchor="middle" class="font-mono" font-size="10.5" font-weight="600" fill="#0f172a">${escXml(chk.yesCode)}</text>`;
      }

      // NO Down Arrow
      const nextY = idx < checks.length - 1 ? y + rowH + gapY - 6 : finalY - 6;
      body += `
  <line x1="300" y1="${y + rowH}" x2="300" y2="${nextY}" stroke="#64748b" stroke-width="2" marker-end="url(#arrow-slate)" />
  <rect x="310" y="${y + rowH + 5}" width="210" height="18" rx="4" fill="#f1f5f9" />
  <text x="316" y="${y + rowH + 18}" class="font-mono" font-size="10" font-weight="600" fill="#475569">NO: ${escXml(chk.noLabel || 'Continue')}</text>`;
    });

    body += `
  <rect x="40" y="${finalY}" width="1000" height="48" rx="10" fill="#ecfdf5" stroke="#10b981" stroke-width="1.75" />
  <text x="540" y="${finalY + 29}" text-anchor="middle" class="font-mono" font-size="12" font-weight="700" fill="#065f46">${escXml(state.finalBox)}</text>`;

    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  // 10. CLOUD VPC / SECURITY TRUST BOUNDARIES (Nested Zones)
  function buildBoundary(state) {
    const width = 1080;
    const zones = (state.zones && state.zones.length) ? state.zones.slice(0, 4) : [{ name: 'Zone 1', cidr: '', theme: 'teal', items: 'Resource A' }];
    const parsed = zones.map((z) => splitItems(z.items, 5));
    const maxItems = Math.max(2, ...parsed.map((p) => p.length));
    const zoneH = 88 + maxItems * 42 + 16;
    const outerH = 68 + zoneH + (state.bottomNote ? 60 : 24);
    const totalHeight = 98 + outerH + 34;

    let body = `
  <rect x="40" y="98" width="1000" height="${outerH}" rx="14" fill="#ffffff" stroke="#0f766e" stroke-width="2" stroke-dasharray="8,5" />
  <rect x="60" y="86" width="${Math.min(760, Math.max(280, String(state.outerLabel || '').length * 7.2 + 28))}" height="24" rx="6" fill="#0f172a" />
  <text x="74" y="102" class="font-mono" font-size="11" font-weight="700" fill="#5eead4">${escXml(state.outerLabel)}</text>`;

    const zCount = zones.length;
    const zGap = 28;
    const innerW = 952;
    const zW = Math.floor((innerW - zGap * (zCount - 1)) / zCount);
    const zY = 136;

    const zThemes = {
      teal: { bg: '#f0fdfa', stroke: '#0d9488', head: '#0f766e' },
      sky: { bg: '#f0f9ff', stroke: '#0284c7', head: '#0369a1' },
      amber: { bg: '#fffbeb', stroke: '#d97706', head: '#b45309' },
      slate: { bg: '#f8fafc', stroke: '#64748b', head: '#334155' }
    };

    zones.forEach((z, idx) => {
      const zx = 64 + idx * (zW + zGap);
      const th = zThemes[z.theme] || zThemes.teal;
      body += `
  <rect x="${zx}" y="${zY}" width="${zW}" height="${zoneH}" rx="10" fill="${th.bg}" stroke="${th.stroke}" stroke-width="1.75" />
  <rect x="${zx}" y="${zY}" width="${zW}" height="52" rx="10" fill="${th.head}" />
  <rect x="${zx}" y="${zY + 40}" width="${zW}" height="12" fill="${th.head}" />
  <text x="${zx + zW / 2}" y="${zY + 24}" text-anchor="middle" class="font-sans" font-size="13.5" font-weight="700" fill="#ffffff">${escXml(z.name)}</text>
  <text x="${zx + zW / 2}" y="${zY + 42}" text-anchor="middle" class="font-mono" font-size="10" fill="#e2e8f0">${escXml(z.cidr)}</text>`;

      parsed[idx].forEach((it, iIdx) => {
        const iy = zY + 68 + iIdx * 42;
        body += `
  <rect x="${zx + 14}" y="${iy}" width="${zW - 28}" height="32" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.25" />
  <text x="${zx + zW / 2}" y="${iy + 20}" text-anchor="middle" class="font-sans" font-size="11.5" font-weight="600" fill="#1e293b">${escXml(it)}</text>`;
      });

      if (idx < zCount - 1) {
        const ay = zY + Math.round(zoneH / 2);
        body += `
  <line x1="${zx + zW}" y1="${ay}" x2="${zx + zW + zGap - 6}" y2="${ay}" stroke="#0d9488" stroke-width="2.25" marker-end="url(#arrow-teal)" />`;
      }
    });

    if (state.bottomNote && state.bottomNote.trim()) {
      const ny = zY + zoneH + 16;
      body += `
  <rect x="64" y="${ny}" width="${innerW}" height="34" rx="7" fill="#ecfdf5" stroke="#6ee7b7" />
  <text x="540" y="${ny + 21}" text-anchor="middle" class="font-mono" font-size="11" font-weight="600" fill="#065f46">${escXml(state.bottomNote)}</text>`;
    }

    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  // 11. MULTI-TOPIC DIFFERENTIAL (2, 3, 4, 5+ Topics — Matrix Table OR Side-by-Side Cards)
  function parseStatusPrefix(raw) {
    const str = String(raw || '').trim();
    if (str.startsWith('[+]')) return { tag: 'PRO', bg: '#dcfce7', stroke: '#86efac', col: '#166534', text: str.slice(3).trim() };
    if (str.startsWith('[!]')) return { tag: 'WARN', bg: '#fef3c7', stroke: '#fcd34d', col: '#92400e', text: str.slice(3).trim() };
    if (str.startsWith('[-]')) return { tag: 'NO', bg: '#fee2e2', stroke: '#fca5a5', col: '#991b1b', text: str.slice(3).trim() };
    return { tag: '', bg: '', stroke: '', col: '#1e293b', text: str };
  }

  function buildDifferential(state) {
    const topics = (state.topics && state.topics.length >= 2)
      ? state.topics.slice(0, 6)
      : [
          { name: 'Topic A', badge: 'Option 1', theme: 'teal', verdict: 'Best for X' },
          { name: 'Topic B', badge: 'Option 2', theme: 'sky', verdict: 'Best for Y' }
        ];
    const rows = (state.rows && state.rows.length)
      ? state.rows
      : [{ label: 'Feature 1', values: topics.map(() => 'Value') }];

    const tCount = topics.length;
    const width = tCount <= 3 ? 1080 : tCount === 4 ? 1220 : 1380;

    const palette = {
      teal: { head: '#0f766e', light: '#f0fdfa', border: '#14b8a6', text: '#0f766e', badgeBg: '#115e59' },
      sky: { head: '#0369a1', light: '#f0f9ff', border: '#38bdf8', text: '#0369a1', badgeBg: '#075985' },
      violet: { head: '#6d28d9', light: '#f5f3ff', border: '#a78bfa', text: '#5b21b6', badgeBg: '#4c1d95' },
      amber: { head: '#b45309', light: '#fffbeb', border: '#f59e0b', text: '#92400e', badgeBg: '#78350f' },
      slate: { head: '#1e293b', light: '#f1f5f9', border: '#94a3b8', text: '#334155', badgeBg: '#0f172a' }
    };

    // SUB-STYLE B: N-Column Side-by-Side Differential Cards
    if (state.diffStyle === 'cards') {
      const gap = 18;
      const usableW = width - 80;
      const cardW = Math.floor((usableW - gap * (tCount - 1)) / tCount);
      const maxValChars = Math.max(18, Math.floor((cardW - 36) / 6.8));

      const rowHeights = rows.map((r) => {
        let maxLn = 1;
        topics.forEach((_, ti) => {
          const parsed = parseStatusPrefix((r.values || [])[ti] || '');
          maxLn = Math.max(maxLn, wrapLines(parsed.text, maxValChars).slice(0, 3).length);
        });
        return 34 + maxLn * 18 + 10;
      });

      const contentH = rowHeights.reduce((a, b) => a + b + 8, 0);
      const cardH = 74 + contentH + 64;
      const totalHeight = 102 + cardH + 34;
      let body = '';

      topics.forEach((tp, ti) => {
        const th = palette[tp.theme] || palette.teal;
        const cx = 40 + ti * (cardW + gap);
        const cy = 102;
        body += `
  <rect x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" rx="12" fill="#ffffff" stroke="${th.border}" stroke-width="2" />
  <rect x="${cx}" y="${cy}" width="${cardW}" height="62" rx="12" fill="${th.head}" />
  <rect x="${cx}" y="${cy + 48}" width="${cardW}" height="14" fill="${th.head}" />
  <text x="${cx + cardW / 2}" y="${cy + 26}" text-anchor="middle" class="font-sans" font-size="14.5" font-weight="700" fill="#ffffff">${escXml(tp.name)}</text>
  <rect x="${cx + 24}" y="${cy + 34}" width="${cardW - 48}" height="20" rx="10" fill="${th.badgeBg}" />
  <text x="${cx + cardW / 2}" y="${cy + 48}" text-anchor="middle" class="font-mono" font-size="10" font-weight="600" fill="#e2e8f0">${escXml(tp.badge)}</text>`;

        let ry = cy + 74;
        rows.forEach((r, ri) => {
          const rh = rowHeights[ri];
          const rawVal = (r.values || [])[ti] || '-';
          const parsed = parseStatusPrefix(rawVal);
          const vLines = wrapLines(parsed.text, maxValChars).slice(0, 3);
          const boxBg = parsed.bg || '#f8fafc';
          const boxStroke = parsed.stroke || '#e2e8f0';

          body += `
  <rect x="${cx + 12}" y="${ry}" width="${cardW - 24}" height="${rh}" rx="7" fill="${boxBg}" stroke="${boxStroke}" stroke-width="1.25" />
  <text x="${cx + 22}" y="${ry + 17}" class="font-mono" font-size="9.5" font-weight="700" fill="#64748b">${escXml(String(r.label || '').toUpperCase())}</text>`;
          vLines.forEach((ln, li) => {
            body += `
  <text x="${cx + 22}" y="${ry + 35 + li * 17}" class="font-sans" font-size="12" font-weight="600" fill="${parsed.col}">${escXml(ln)}</text>`;
          });
          ry += rh + 8;
        });

        const vy = cy + cardH - 52;
        const vLines = wrapLines(tp.verdict, maxValChars).slice(0, 2);
        body += `
  <rect x="${cx + 12}" y="${vy}" width="${cardW - 24}" height="40" rx="7" fill="${th.light}" stroke="${th.border}" />`;
        if (vLines.length <= 1) {
          body += `
  <text x="${cx + cardW / 2}" y="${vy + 24}" text-anchor="middle" class="font-sans" font-size="11.5" font-weight="700" fill="${th.text}">${escXml(vLines[0] || '')}</text>`;
        } else {
          body += `
  <text x="${cx + cardW / 2}" y="${vy + 17}" text-anchor="middle" class="font-sans" font-size="11" font-weight="700" fill="${th.text}">${escXml(vLines[0])}</text>
  <text x="${cx + cardW / 2}" y="${vy + 32}" text-anchor="middle" class="font-sans" font-size="11" font-weight="700" fill="${th.text}">${escXml(vLines[1])}</text>`;
        }
      });

      return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
    }

    // SUB-STYLE A (Default): Row-Aligned Criterion Comparison Matrix
    const tableX = 40;
    const tableW = width - 80;
    const labelColW = tCount >= 4 ? 176 : 196;
    const topicColW = Math.floor((tableW - labelColW) / tCount);
    const actualTableW = labelColW + topicColW * tCount;
    const maxCellChars = Math.max(18, Math.floor((topicColW - 28) / 6.8));

    const headerH = 68;
    const computedRows = rows.map((r) => {
      const cells = topics.map((_, ti) => {
        const p = parseStatusPrefix((r.values || [])[ti] || '-');
        return { ...p, lines: wrapLines(p.text, maxCellChars).slice(0, 3) };
      });
      const labelLines = wrapLines(r.label, 22).slice(0, 2);
      const maxLines = Math.max(labelLines.length, ...cells.map((c) => c.lines.length));
      const rh = Math.max(50, 24 + maxLines * 18);
      return { labelLines, cells, height: rh };
    });

    const verdictCells = topics.map((tp) => wrapLines(tp.verdict, maxCellChars).slice(0, 2));
    const verdictH = 58;
    const tableH = headerH + computedRows.reduce((s, r) => s + r.height, 0) + verdictH;
    const totalHeight = 102 + tableH + 34;

    let body = `
  <rect x="${tableX}" y="102" width="${actualTableW}" height="${tableH}" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.75" />
  <rect x="${tableX}" y="102" width="${labelColW}" height="${headerH}" rx="12" fill="#0f172a" />
  <rect x="${tableX + labelColW - 14}" y="102" width="14" height="${headerH}" fill="#0f172a" />
  <rect x="${tableX}" y="${102 + headerH - 14}" width="${labelColW}" height="14" fill="#0f172a" />
  <text x="${tableX + labelColW / 2}" y="141" text-anchor="middle" class="font-mono" font-size="12" font-weight="700" fill="#5eead4">${escXml(state.criteriaHeader || 'Dimension')}</text>`;

    topics.forEach((tp, ti) => {
      const th = palette[tp.theme] || palette.teal;
      const cx = tableX + labelColW + ti * topicColW;
      const isLast = ti === tCount - 1;
      body += `
  <rect x="${cx}" y="102" width="${topicColW}" height="${headerH}" rx="${isLast ? 12 : 0}" fill="${th.head}" />`;
      if (isLast) {
        body += `
  <rect x="${cx}" y="102" width="14" height="${headerH}" fill="${th.head}" />
  <rect x="${cx}" y="${102 + headerH - 14}" width="${topicColW}" height="14" fill="${th.head}" />`;
      }
      body += `
  <line x1="${cx}" y1="102" x2="${cx}" y2="${102 + tableH}" stroke="#e2e8f0" stroke-width="1.25" />
  <text x="${cx + topicColW / 2}" y="129" text-anchor="middle" class="font-sans" font-size="${tCount >= 5 ? 12.5 : 14}" font-weight="700" fill="#ffffff">${escXml(tp.name)}</text>
  <rect x="${cx + 16}" y="138" width="${topicColW - 32}" height="20" rx="10" fill="${th.badgeBg}" />
  <text x="${cx + topicColW / 2}" y="152" text-anchor="middle" class="font-mono" font-size="10" font-weight="600" fill="#e2e8f0">${escXml(tp.badge)}</text>`;
    });

    let curY = 102 + headerH;
    computedRows.forEach((r, ri) => {
      const zebra = ri % 2 === 1 ? '#f8fafc' : '#ffffff';
      body += `
  <rect x="${tableX + 1}" y="${curY}" width="${actualTableW - 2}" height="${r.height}" fill="${zebra}" />
  <rect x="${tableX + 1}" y="${curY}" width="${labelColW - 1}" height="${r.height}" fill="#f1f5f9" />
  <line x1="${tableX}" y1="${curY}" x2="${tableX + actualTableW}" y2="${curY}" stroke="#cbd5e1" stroke-width="1.25" />`;

      const lblStartY = curY + Math.round((r.height - (r.labelLines.length - 1) * 17) / 2) + 4;
      r.labelLines.forEach((ln, li) => {
        body += `
  <text x="${tableX + 16}" y="${lblStartY + li * 17}" class="font-sans" font-size="12.5" font-weight="700" fill="#0f172a">${escXml(ln)}</text>`;
      });

      r.cells.forEach((cell, ti) => {
        const cx = tableX + labelColW + ti * topicColW;
        body += `
  <line x1="${cx}" y1="${curY}" x2="${cx}" y2="${curY + r.height}" stroke="#e2e8f0" stroke-width="1.25" />`;
        if (cell.bg) {
          body += `
  <rect x="${cx + 8}" y="${curY + 7}" width="${topicColW - 16}" height="${r.height - 14}" rx="6" fill="${cell.bg}" stroke="${cell.stroke}" />`;
        }
        const txtStartY = curY + Math.round((r.height - (cell.lines.length - 1) * 17) / 2) + 4;
        cell.lines.forEach((ln, li) => {
          body += `
  <text x="${cx + topicColW / 2}" y="${txtStartY + li * 17}" text-anchor="middle" class="font-sans" font-size="12" font-weight="600" fill="${cell.col}">${escXml(ln)}</text>`;
        });
      });
      curY += r.height;
    });

    // Bottom Verdict / "Best For" Row
    body += `
  <line x1="${tableX}" y1="${curY}" x2="${tableX + actualTableW}" y2="${curY}" stroke="#94a3b8" stroke-width="1.5" />
  <rect x="${tableX + 1}" y="${curY + 1}" width="${labelColW - 1}" height="${verdictH - 2}" rx="10" fill="#0f172a" />
  <rect x="${tableX + 1}" y="${curY + 1}" width="${labelColW - 1}" height="14" fill="#0f172a" />
  <rect x="${tableX + labelColW - 14}" y="${curY + 1}" width="14" height="${verdictH - 2}" fill="#0f172a" />
  <text x="${tableX + labelColW / 2}" y="${curY + 34}" text-anchor="middle" class="font-mono" font-size="11.5" font-weight="700" fill="#5eead4">BEST FOR</text>`;

    topics.forEach((tp, ti) => {
      const th = palette[tp.theme] || palette.teal;
      const cx = tableX + labelColW + ti * topicColW;
      const vLines = verdictCells[ti];
      body += `
  <rect x="${cx + 6}" y="${curY + 6}" width="${topicColW - 12}" height="${verdictH - 12}" rx="7" fill="${th.light}" stroke="${th.border}" />`;
      const vy = curY + Math.round((verdictH - (vLines.length - 1) * 16) / 2) + 4;
      vLines.forEach((ln, li) => {
        body += `
  <text x="${cx + topicColW / 2}" y="${vy + li * 16}" text-anchor="middle" class="font-sans" font-size="11.5" font-weight="700" fill="${th.text}">${escXml(ln)}</text>`;
      });
    });

    return { svg: svgHeader(state, width, totalHeight) + body + '\n</svg>', width, height: totalHeight };
  }

  window.DIAGRAM_RENDERERS = {
    escXml,
    pipeline: buildPipeline,
    comparison: buildComparison,
    threeway: buildThreeWay,
    differential: buildDifferential,
    stack: buildStack,
    hub: buildHub,
    sequence: buildSequence,
    tree: buildTree,
    timeline: buildTimeline,
    decision: buildDecision,
    boundary: buildBoundary
  };
})();
