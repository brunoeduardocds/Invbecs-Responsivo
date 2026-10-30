// ============================================
// CHARTS - Donut/Pie Charts (Canvas API, no deps)
// ============================================

const CHART_COLORS = [
  '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#3b82f6', '#14b8a6',
  '#f97316', '#a855f7', '#84cc16', '#6366f1'
];

function drawDonutChart(canvasId, data, legendId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 180;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * 0.6;

  ctx.clearRect(0, 0, size, size);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    // Empty state ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(99, 140, 200, 0.1)';
    ctx.lineWidth = outerR - innerR;
    ctx.stroke();

    ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados', cx, cy);

    if (legendId) {
      const leg = document.getElementById(legendId);
      if (leg) leg.innerHTML = '';
    }
    return;
  }

  let startAngle = -Math.PI / 2;
  const gaps = data.length > 1 ? 0.03 : 0;

  data.forEach((item, i) => {
    const slice = (item.value / total) * (Math.PI * 2) - gaps;
    const color = CHART_COLORS[i % CHART_COLORS.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle + gaps / 2, startAngle + slice + gaps / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    startAngle += slice + gaps;
  });

  // Inner circle (donut hole)
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#131e35';
  ctx.fill();

  // Center total text
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `700 ${total >= 100 ? '18' : '22'}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy - 8);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 10px Inter, sans-serif';
  ctx.fillText('total', cx, cy + 10);

  // Legend
  if (legendId) {
    const leg = document.getElementById(legendId);
    if (leg) {
      leg.innerHTML = data.map((item, i) => `
        <div class="legend-item">
          <span class="legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
          <span>${escapeHtml(item.label)}</span>
          <span class="legend-count">${item.value}</span>
        </div>
      `).join('');
    }
  }
}

function updateCharts() {
  // Categoria chart
  const catCount = {};
  DB.equipamentos.forEach(e => {
    catCount[e.categoria] = (catCount[e.categoria] || 0) + 1;
  });
  const catData = Object.entries(catCount)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  drawDonutChart('chartCategoria', catData, 'chartCategoriaLegend');

  // Status chart
  const statusCount = {};
  DB.equipamentos.forEach(e => {
    statusCount[e.status] = (statusCount[e.status] || 0) + 1;
  });
  const statusData = Object.entries(statusCount)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  drawDonutChart('chartStatus', statusData, 'chartStatusLegend');
}
