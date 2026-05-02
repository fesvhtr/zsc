const data = window.ECCE734_DATA;
const allRows = Object.values(data.datasets).flat();
const workloadDisplay = Object.fromEntries(data.summary.map((row) => [row.workload, row.display]));
const stageNames = {
  stage1: "Stage 1",
  stage2: "Stage 2",
  stage3: "Stage 3",
  "stage1-required": "Stage 1",
  "stage2-transformer": "Stage 2",
  "stage3-ttt": "Stage 3",
};
const sweepNames = {
  rob_issue: "ROB / issue width",
  lq: "Load queue",
  sq: "Store queue",
  fu: "Functional units",
};
const colors = ["#1f7a8c", "#8a5a00", "#6f5aa8", "#2f7d32", "#b4443f"];
let selectedDetailWorkload = "attention_kvcache";
let selectedPlotWorkload = "attention_kvcache";

const format = {
  ipc: (value) => Number(value).toFixed(3),
  pct: (value) => `${Number(value).toFixed(1)}%`,
  millions: (value) => (value == null ? "--" : `${(Number(value) / 1_000_000).toFixed(2)}M`),
  int: (value) => (value == null ? "--" : Number(value).toLocaleString()),
  missRate: (value) => (value == null ? "--" : `${(Number(value) * 100).toFixed(1)}%`),
};

function setTotalRuns() {
  document.getElementById("total-runs").textContent = allRows.length;
}

function renderTable(targetId, columns, rows) {
  const table = document.getElementById(targetId);
  const thead = columns.map((column) => `<th>${column.label}</th>`).join("");
  const tbody = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const raw = typeof column.value === "function" ? column.value(row) : row[column.value];
          return `<td>${raw ?? "--"}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  table.innerHTML = `<thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody>`;
}

function stageLabel(stage) {
  return stageNames[stage] || stage;
}

function renderSummary() {
  renderTable(
    "summary-table",
    [
      { label: "Stage", value: (row) => stageLabel(row.stage) },
      { label: "Workload", value: "display" },
      { label: "Baseline IPC", value: (row) => format.ipc(row.baseline_ipc) },
      { label: "Best IPC", value: (row) => format.ipc(row.best_ipc) },
      { label: "Improvement", value: (row) => format.pct(row.improvement_pct) },
      {
        label: "Best Configuration",
        value: (row) =>
          `ROB ${row.best_config.rob}, IW ${row.best_config.issue_width}, LQ ${row.best_config.lq}, SQ ${row.best_config.sq}, FU ${row.best_config.fu}`,
      },
      { label: "Main Sensitivity", value: "main_sensitivity" },
    ],
    data.summary
  );
}

function renderMemory() {
  const rows = data.summary.filter((row) =>
    ["attention_recompute", "attention_kvcache", "ffn_infer", "ffn_ttt_w2"].includes(row.workload)
  );
  renderTable(
    "memory-table",
    [
      { label: "Workload", value: "display" },
      { label: "SimInsts", value: (row) => format.millions(row.sim_insts) },
      { label: "D-cache Accesses", value: (row) => format.millions(row.dcache_accesses) },
      { label: "D-cache Miss Rate", value: (row) => format.missRate(row.dcache_miss_rate) },
      { label: "D-cache Writebacks", value: (row) => format.int(row.dcache_writebacks) },
      { label: "Memory Packets", value: (row) => format.int(row.dcache_mem_packets) },
      { label: "Main Sensitivity", value: "main_sensitivity" },
    ],
    rows
  );
}

function summaryFor(workload) {
  return data.summary.find((row) => row.workload === workload);
}

function ratio(a, b) {
  return Number(a) / Number(b);
}

function renderTakeaways() {
  const recompute = summaryFor("attention_recompute");
  const kv = summaryFor("attention_kvcache");
  const ffn = summaryFor("ffn_infer");
  const ttt = summaryFor("ffn_ttt_w2");
  const matmul = summaryFor("matmul");
  const quicksort = summaryFor("quicksort");
  const cards = [
    {
      title: "Dense kernels use backend width",
      number: `${format.pct(matmul.improvement_pct)}`,
      text: "Matmul gains the most from ROB and issue-width scaling, while quicksort improves by less than 1%.",
    },
    {
      title: "KV cache cuts instructions",
      number: `${ratio(recompute.sim_insts, kv.sim_insts).toFixed(1)}x`,
      text: "Attention with KV cache executes far fewer instructions than no-KV recompute, but becomes much more cache-read-heavy.",
    },
    {
      title: "TTT creates writeback pressure",
      number: `${ratio(ttt.dcache_writebacks, ffn.dcache_writebacks).toFixed(1)}x`,
      text: "Updating W2 during inference turns model weights into dirty cache lines and sharply increases D-cache writebacks.",
    },
  ];

  document.getElementById("takeaway-grid").innerHTML = cards
    .map(
      (card) => `
        <article class="insight-card">
          <h3>${card.title}</h3>
          <span class="big-number">${card.number}</span>
          <p>${card.text}</p>
        </article>
      `
    )
    .join("");
}

function setupDetail() {
  renderButtonStrip("detail-workload-buttons", selectedDetailWorkload, (workload) => {
    selectedDetailWorkload = workload;
    setupDetail();
  });
  renderDetail();
}

function bestConfigText(config) {
  return `ROB ${config.rob}, IW ${config.issue_width}, LQ ${config.lq}, SQ ${config.sq}, FU ${config.fu}`;
}

function renderDetail() {
  const row = summaryFor(selectedDetailWorkload);
  if (!row) return;
  const card = document.getElementById("detail-card");
  card.innerHTML = `
    <header>
      <div>
        <p class="eyebrow">${stageLabel(row.stage)}</p>
        <h3>${row.display}</h3>
      </div>
      <small>${row.main_sensitivity}</small>
    </header>
    <div class="detail-grid">
      <div><strong>${format.ipc(row.baseline_ipc)}</strong><small>Baseline IPC</small></div>
      <div><strong>${format.ipc(row.best_ipc)}</strong><small>Best IPC</small></div>
      <div><strong>${format.pct(row.improvement_pct)}</strong><small>Best-vs-baseline gain</small></div>
      <div><strong>${format.millions(row.sim_insts)}</strong><small>Baseline instructions</small></div>
      <div><strong>${bestConfigText(row.best_config)}</strong><small>Best configuration</small></div>
      <div><strong>${format.millions(row.dcache_accesses)}</strong><small>D-cache accesses</small></div>
      <div><strong>${format.missRate(row.dcache_miss_rate)}</strong><small>D-cache miss rate</small></div>
      <div><strong>${format.int(row.dcache_writebacks)}</strong><small>D-cache writebacks</small></div>
    </div>
  `;
}

function renderComparisons() {
  const recompute = summaryFor("attention_recompute");
  const kv = summaryFor("attention_kvcache");
  const ffn = summaryFor("ffn_infer");
  const ttt = summaryFor("ffn_ttt_w2");
  const comparisons = [
    {
      title: "No-KV attention vs KV-cache attention",
      stats: [
        `${ratio(recompute.sim_insts, kv.sim_insts).toFixed(1)}x fewer instructions with KV cache`,
        `${ratio(kv.dcache_miss_rate, recompute.dcache_miss_rate).toFixed(1)}x higher D-cache miss rate with KV cache`,
        `${ratio(kv.dcache_mem_packets, recompute.dcache_mem_packets).toFixed(1)}x more D-cache memory packets`,
      ],
      text: "KV cache removes repeated K/V projection work, but shifts decode toward cache reads.",
    },
    {
      title: "Fixed FFN inference vs TTT W2 update",
      stats: [
        `${ratio(ttt.sim_insts, ffn.sim_insts).toFixed(1)}x more instructions with TTT`,
        `${ratio(ttt.dcache_accesses, ffn.dcache_accesses).toFixed(1)}x more D-cache accesses`,
        `${ratio(ttt.dcache_writebacks, ffn.dcache_writebacks).toFixed(1)}x more D-cache writebacks`,
      ],
      text: "TTT changes inference from read-mostly weight access to read-modify-write model-state updates.",
    },
  ];

  document.getElementById("comparison-grid").innerHTML = comparisons
    .map(
      (card) => `
        <article class="comparison-card">
          <h3>${card.title}</h3>
          ${card.stats.map((stat) => `<span class="big-number">${stat}</span>`).join("")}
          <p>${card.text}</p>
        </article>
      `
    )
    .join("");
}

function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter((value) => value != null))].sort();
}

function workloadOrder() {
  return data.summary.map((row) => row.workload);
}

function renderButtonStrip(targetId, selected, onSelect) {
  const target = document.getElementById(targetId);
  target.innerHTML = workloadOrder()
    .map((workload) => {
      const active = workload === selected ? " active" : "";
      return `<button class="workload-button${active}" type="button" data-workload="${workload}">${workloadDisplay[workload]}</button>`;
    })
    .join("");
  target.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.workload));
  });
}

function setSelectOptions(select, values, allLabel = "All", labelFor = (value) => value) {
  select.innerHTML = [`<option value="">${allLabel}</option>`]
    .concat(values.map((value) => `<option value="${value}">${labelFor(value)}</option>`))
    .join("");
}

function setupFilters() {
  const stageSelect = document.getElementById("stage-filter");
  const workloadSelect = document.getElementById("workload-filter");
  const sweepSelect = document.getElementById("sweep-filter");

  setSelectOptions(stageSelect, Object.keys(data.datasets), "All stages", stageLabel);
  setSelectOptions(workloadSelect, uniqueValues(allRows, "workload"), "All workloads", (workload) => workloadDisplay[workload]);
  setSelectOptions(sweepSelect, uniqueValues(allRows, "sweep"), "All sweeps", (sweep) => sweepNames[sweep]);

  [stageSelect, workloadSelect, sweepSelect].forEach((select) => {
    select.addEventListener("change", renderRuns);
  });
}

function setupInteractivePlot() {
  renderButtonStrip("plot-workload-buttons", selectedPlotWorkload, (workload) => {
    selectedPlotWorkload = workload;
    setupInteractivePlot();
  });
  renderInteractivePlot();
}

function rowsForInteractive(workload, sweep) {
  return allRows.filter((row) => row.workload === workload && row.sweep === sweep);
}

function makeSeries(rows, sweep) {
  if (sweep === "rob_issue") {
    const byIssue = {};
    rows.forEach((row) => {
      byIssue[row.issue_width] ||= [];
      byIssue[row.issue_width].push({ x: row.rob_size, y: row.ipc, label: String(row.rob_size) });
    });
    return Object.entries(byIssue)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([issue, values]) => ({
        label: `IW=${issue}`,
        values: values.sort((a, b) => Number(a.x) - Number(b.x)),
      }));
  }

  const field = sweep === "lq" ? "lq_size" : sweep === "sq" ? "sq_size" : "fu_config";
  const order = { small: 0, balanced: 1, wide: 2 };
  return [
    {
      label: sweepNames[sweep],
      values: rows
        .map((row) => ({
          x: row[field],
          y: row.ipc,
          label: String(row[field]),
        }))
        .sort((a, b) => {
          if (typeof a.x === "string") return order[a.x] - order[b.x];
          return Number(a.x) - Number(b.x);
        }),
    },
  ];
}

function makeMetricSeries(rows, sweep, metric) {
  const baseSeries = makeSeries(rows, sweep);
  if (metric === "ipc") {
    return baseSeries;
  }
  if (metric === "efficiency") {
    return baseSeries.map((item) => ({
      label: item.label,
      values: item.values.map((point) => {
        const source = rows.find((row) => {
          if (sweep === "rob_issue") {
            return row.rob_size === point.x && `IW=${row.issue_width}` === item.label;
          }
          if (sweep === "lq") return row.lq_size === point.x;
          if (sweep === "sq") return row.sq_size === point.x;
          return row.fu_config === point.x;
        });
        return {
          ...point,
          y: source?.ipc_per_structure_size ?? null,
        };
      }).filter((point) => point.y != null),
    }));
  }

  return baseSeries.map((item) => {
    const values = [];
    for (let i = 1; i < item.values.length; i++) {
      const prev = item.values[i - 1];
      const cur = item.values[i];
      values.push({
        x: `${prev.label}->${cur.label}`,
        y: ((Number(cur.y) - Number(prev.y)) / Number(prev.y)) * 100.0,
        label: `${prev.label}->${cur.label}`,
      });
    }
    return { label: item.label, values };
  });
}

function fixedTextForSweep(sweep) {
  if (sweep === "rob_issue") {
    return "Varied: ROB + issue width · Fixed: LQ=32, SQ=32, FU=balanced";
  }
  if (sweep === "lq") {
    return "Varied: LQ · Fixed: ROB=128, IW=4, SQ=32, FU=balanced";
  }
  if (sweep === "sq") {
    return "Varied: SQ · Fixed: ROB=128, IW=4, LQ=32, FU=balanced";
  }
  return "Varied: FU profile · Fixed: ROB=128, IW=4, LQ=32, SQ=32";
}

function renderOneChart(svgId, workload, sweep, primary = false, metric = "ipc") {
  const svg = document.getElementById(svgId);
  const rows = rowsForInteractive(workload, sweep);
  const series = makeMetricSeries(rows, sweep, metric).filter((item) => item.values.length > 0);
  const width = primary ? 760 : 560;
  const height = primary ? 620 : 250;
  const margin = primary
    ? { top: 72, right: 112, bottom: 58, left: 66 }
    : { top: 62, right: 34, bottom: 42, left: 58 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const yValues = series.flatMap((item) => item.values.map((point) => Number(point.y)));
  const rawMin = Math.min(...yValues);
  const rawMax = Math.max(...yValues);
  const yMin = metric === "gain" ? Math.min(-5, rawMin * 1.12) : Math.max(0, rawMin * 0.92);
  const yMax = metric === "gain" ? Math.max(10, rawMax * 1.12) : rawMax * 1.08;
  const xValues = [...new Set(series.flatMap((item) => item.values.map((point) => point.x)))];
  const xLabels =
    metric === "gain"
      ? xValues
      : sweep === "fu"
        ? ["small", "balanced", "wide"]
        : xValues.sort((a, b) => Number(a) - Number(b));
  const xPos = (x) => {
    const idx = xLabels.findIndex((label) => String(label) === String(x));
    if (xLabels.length === 1) return margin.left + plotW / 2;
    return margin.left + (idx / (xLabels.length - 1)) * plotW;
  };
  const yPos = (y) => margin.top + (1 - (Number(y) - yMin) / (yMax - yMin || 1)) * plotH;

  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
  const lines = [];
  const metricTitle = metric === "ipc" ? "IPC" : metric === "efficiency" ? "Efficiency proxy" : "Adjacent IPC gain";
  lines.push(`<text x="${margin.left}" y="26" class="chart-title">${workloadDisplay[workload]} · ${sweepNames[sweep]} · ${metricTitle}</text>`);
  lines.push(`<text x="${margin.left}" y="46" class="chart-subtitle">${fixedTextForSweep(sweep)}</text>`);

  yTicks.forEach((tick) => {
    const y = yPos(tick);
    lines.push(`<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="grid-line" />`);
    const tickLabel = metric === "gain" ? `${tick.toFixed(0)}%` : tick.toFixed(2);
    lines.push(`<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" class="chart-label">${tickLabel}</text>`);
  });

  if (metric === "gain") {
    const thresholdY = yPos(5);
    lines.push(`<line x1="${margin.left}" y1="${thresholdY}" x2="${width - margin.right}" y2="${thresholdY}" class="threshold-line" />`);
    lines.push(`<text x="${width - margin.right - 4}" y="${thresholdY - 6}" text-anchor="end" class="chart-label">5% threshold</text>`);
  }

  xLabels.forEach((label) => {
    const x = xPos(label);
    lines.push(`<text x="${x}" y="${height - 24}" text-anchor="middle" class="chart-label">${label}</text>`);
  });

  lines.push(`<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" class="axis" />`);
  lines.push(`<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" class="axis" />`);
  const xTitle =
    metric === "gain"
      ? sweep === "rob_issue"
        ? "Adjacent ROB step"
        : "Adjacent configuration step"
      : sweep === "rob_issue"
        ? "ROB entries"
        : sweepNames[sweep];
  const yTitle = metric === "ipc" ? "IPC" : metric === "efficiency" ? "IPC / structure proxy" : "IPC gain (%)";
  lines.push(`<text x="${margin.left + plotW / 2}" y="${height - 6}" text-anchor="middle" class="chart-label">${xTitle}</text>`);
  lines.push(`<text x="20" y="${margin.top + plotH / 2}" text-anchor="middle" class="chart-label" transform="rotate(-90 20 ${margin.top + plotH / 2})">${yTitle}</text>`);

  series.forEach((item, idx) => {
    const color = colors[idx % colors.length];
    const path = item.values.map((point, pointIdx) => `${pointIdx === 0 ? "M" : "L"} ${xPos(point.x)} ${yPos(point.y)}`).join(" ");
    lines.push(`<path d="${path}" fill="none" stroke="${color}" stroke-width="2.2" />`);
    item.values.forEach((point) => {
      const pointLabel = metric === "gain" ? `${Number(point.y).toFixed(2)}%` : Number(point.y).toFixed(3);
      lines.push(`<circle cx="${xPos(point.x)}" cy="${yPos(point.y)}" r="4" fill="${color}"><title>${item.label}: ${pointLabel}</title></circle>`);
    });
    const lx = width - margin.right + 18;
    const ly = margin.top + idx * 22;
    if (primary || series.length > 1) {
      lines.push(`<line x1="${lx}" y1="${ly - 4}" x2="${lx + 14}" y2="${ly - 4}" stroke="${color}" stroke-width="2.2" />`);
      lines.push(`<text x="${lx + 20}" y="${ly}" class="legend-label">${item.label}</text>`);
    }
  });

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.innerHTML = lines.join("");
}

function renderInteractivePlot() {
  renderOneChart("ipc-chart-rob_issue", selectedPlotWorkload, "rob_issue", true);
  renderOneChart("ipc-chart-lq", selectedPlotWorkload, "lq");
  renderOneChart("ipc-chart-sq", selectedPlotWorkload, "sq");
  renderOneChart("ipc-chart-fu", selectedPlotWorkload, "fu");
  renderOneChart("eff-chart-lq", selectedPlotWorkload, "lq", false, "efficiency");
  renderOneChart("eff-chart-sq", selectedPlotWorkload, "sq", false, "efficiency");
  renderOneChart("eff-chart-fu", selectedPlotWorkload, "fu", false, "efficiency");
  renderOneChart("gain-chart-rob_issue", selectedPlotWorkload, "rob_issue", true, "gain");
  renderOneChart("gain-chart-lq", selectedPlotWorkload, "lq", false, "gain");
  renderOneChart("gain-chart-sq", selectedPlotWorkload, "sq", false, "gain");
  renderOneChart("gain-chart-fu", selectedPlotWorkload, "fu", false, "gain");
}

function filteredRows() {
  const stage = document.getElementById("stage-filter").value;
  const workload = document.getElementById("workload-filter").value;
  const sweep = document.getElementById("sweep-filter").value;
  const rows = stage ? data.datasets[stage] : allRows;
  return rows
    .filter((row) => !workload || row.workload === workload)
    .filter((row) => !sweep || row.sweep === sweep)
    .slice()
    .sort((a, b) => {
      if (a.workload !== b.workload) return a.workload.localeCompare(b.workload);
      if (a.sweep !== b.sweep) return a.sweep.localeCompare(b.sweep);
      return Number(a.rob_size) - Number(b.rob_size) || Number(a.issue_width) - Number(b.issue_width);
    });
}

function renderRuns() {
  renderTable(
    "runs-table",
    [
      { label: "Label", value: "label" },
      { label: "Workload", value: (row) => workloadDisplay[row.workload] },
      { label: "Sweep", value: (row) => sweepNames[row.sweep] },
      { label: "ROB", value: "rob_size" },
      { label: "IW", value: "issue_width" },
      { label: "LQ", value: "lq_size" },
      { label: "SQ", value: "sq_size" },
      { label: "FU", value: "fu_config" },
      { label: "IPC", value: (row) => format.ipc(row.ipc) },
      { label: "SimInsts", value: (row) => format.int(row.sim_insts) },
      { label: "D$ Miss Rate", value: (row) => format.missRate(row.dcache_miss_rate) },
      { label: "D$ Writebacks", value: (row) => format.int(row.dcache_writebacks) },
    ],
    filteredRows()
  );
}

setTotalRuns();
renderTakeaways();
renderSummary();
setupDetail();
renderMemory();
renderComparisons();
setupInteractivePlot();
setupFilters();
renderRuns();
