// Shared helpers

function formatDate(d) {
  if (!d || d.length !== 8) return d || '—';
  return d.slice(0,4) + '-' + d.slice(4,6) + '-' + d.slice(6);
}

function classLabel(cls) {
  if (cls === 'Class I')   return '<span class="class-i">Class I</span>';
  if (cls === 'Class II')  return '<span class="class-ii">Class II</span>';
  if (cls === 'Class III') return '<span class="class-iii">Class III</span>';
  return cls || '—';
}

async function saveRecall(r) {
  await fetch('/api/saved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id:            r.event_id,
      product_description: r.product_description,
      reason_for_recall:   r.reason_for_recall,
      classification:      r.classification,
      recalling_firm:      r.recalling_firm,
      report_date:         r.report_date,
      state:               r.state
    })
  });
}
