(() => {
  const C = window.CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const KEY = "vehicleChecklistDraft.v1";

  // ---- Checklist definition (from Maintenance_Checklist.xlsx) ----
  const SECTIONS = [
    { title: "Power", note: "Always have sufficient fuel, of the correct grade.", items: ["Fuel", "Battery"] },
    { title: "Oils and Other Liquids", note: "Inspect the engine oil and other liquids regularly.", items: ["Engine oil", "Brake Fluid", "ATF/Power steering fluid", "Gear Oil"] },
    { title: "Water", note: "Ensure that the radiator and washer reservoir is always full and contains the correct additive.", items: ["Radiator", "Radiator Reservoir", "Coolant"] },
    { title: "Damages", note: "Inspect outside and inside the vehicle for any damage that has occurred while parked which might endanger your safety.", items: ["Check windows/Windshield for function", "Front Fenders", "Rear Fenders", "Radiator shroud"] },
    { title: "Electricals", note: "Inspect all lights, radio, AC, electric windows, wipers, central lock, battery connections and horn.", items: ["Aircon System", "Radio", "Horn", "All Lights", "Wipers", "Dashboard Signs", "Door Locks", "Electric Window"] },
    { title: "Rubber", note: "When checking tyre pressure, also check the tread for wear. A good rule of thumb is a 1.6 mm minimum.",
      items: [{ n: "Front Tyre", tyre: 1 }, { n: "Rear Tyre", tyre: 1 }, { n: "Spare Tyre", tyre: 1 }, "Belts"] },
    { title: "Extras", items: ["First Aid Kit", "Fire Extinguisher", "Tire Jack", "Early Warning Device", "Umbrella", "Flashlight", "Series Cable", "Tools"] },
    { title: "Safety and Emergency Devices", note: "Always ensure all safety kits are working properly.", items: ["Tire Inflator", "Power Inverter", "GPS", "Dash Camera", "Emergency Vulkit"] },
    { title: "Documents", items: ["Copy of Original OR/CR", "Copy of Insurance"] },
    { title: "Cleanliness", items: ["Cleanliness"] }
  ];
  const MAINT_COLS = [
    ["date", "Date", "date"], ["type", "Maintenance Type", "text"], ["desc", "Description", "text"],
    ["km", "Km Reading", "number"], ["jo", "Job Order", "text"], ["shop", "Shop", "text"],
    ["amount", "Amount", "number"], ["finish", "Date Finish", "date"]
  ];

  $("#org").textContent = C.organization;
  $("#dept").textContent = C.department;

  // ---- Build checklist ----
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const items = []; // flat list for export {id,section,label,tyre}
  const cl = $("#checklist");
  SECTIONS.forEach(sec => {
    const d = document.createElement("div");
    d.className = "section";
    d.innerHTML = `<h3>${sec.title}</h3>${sec.note ? `<p class="hint">${sec.note}</p>` : ""}`;
    sec.items.forEach(it => {
      const o = typeof it === "string" ? { n: it } : it;
      const id = slug(sec.title) + "__" + slug(o.n);
      items.push({ id, section: sec.title, label: o.n, tyre: !!o.tyre });
      const r = document.createElement("div");
      r.className = "item";
      r.innerHTML = `
        <div class="lbl">${o.n}</div>
        <div class="seg" role="radiogroup" aria-label="${o.n}">
          <label><input type="radio" name="${id}" value="Good"><span>Good</span></label>
          <label><input type="radio" name="${id}" value="Fair"><span>Fair</span></label>
        </div>
        ${o.tyre ? `<label class="mini">Default PSI <input type="number" inputmode="decimal" name="${id}__psi"></label>
                    <label class="mini">Thickness % <input type="number" inputmode="decimal" name="${id}__thick"></label>` : ""}
        <input class="rem" name="${id}__rem" placeholder="Remarks / recommendation">`;
      d.appendChild(r);
    });
    cl.appendChild(d);
  });

  // ---- Maintenance rows ----
  const maint = $("#maint");
  let maintCount = 0;
  function addMaint() {
    const i = maintCount++;
    const row = document.createElement("div");
    row.className = "mrow";
    row.innerHTML = `<div class="mnum">#${i + 1}</div>` + MAINT_COLS.map(([k, l, t]) =>
      `<label>${l}<input type="${t}" name="m${i}_${k}" ${t === "number" ? 'inputmode="decimal"' : ""}></label>`).join("");
    maint.appendChild(row);
  }
  for (let i = 0; i < C.maintenanceRows; i++) addMaint();
  $("#addMaint").onclick = () => addMaint();

  // ---- Signature pad ----
  const cv = $("#sig"), ctx = cv.getContext("2d");
  let drawing = false, signed = false;
  function sizeCanvas(keep) {
    const img = keep && signed ? cv.toDataURL() : null;
    const w = cv.parentElement.clientWidth - 2;
    cv.width = w; cv.height = 140;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
    if (img) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0); im.src = img; }
  }
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener("pointerdown", e => { drawing = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); });
  cv.addEventListener("pointermove", e => { if (!drawing) return; ctx.lineTo(...pos(e)); ctx.stroke(); signed = true; });
  ["pointerup", "pointercancel"].forEach(ev => cv.addEventListener(ev, () => { drawing = false; save(); }));
  $("#sigClear").onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); signed = false; save(); };
  sizeCanvas();
  window.addEventListener("resize", () => sizeCanvas(true));

  // ---- Data in/out + autosave ----
  const form = $("#form");
  function collect() {
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });
    form.querySelectorAll('input[type=checkbox]').forEach(c => { data[c.name] = c.checked; });
    data._maintCount = maintCount;
    data._signature = signed ? cv.toDataURL("image/png") : "";
    return data;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(collect())); } catch (e) {} }
  function restore() {
    let d; try { d = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (!d) return false;
    while (maintCount < (d._maintCount || 0)) addMaint();
    Object.entries(d).forEach(([k, v]) => {
      if (k.startsWith("_")) return;
      const els = form.querySelectorAll(`[name="${k}"]`);
      els.forEach(el => {
        if (el.type === "checkbox") el.checked = !!v;
        else if (el.type === "radio") el.checked = el.value === v;
        else el.value = v;
      });
    });
    if (d._signature) { const im = new Image(); im.onload = () => { ctx.drawImage(im, 0, 0, cv.width, 140); signed = true; }; im.src = d._signature; }
    return true;
  }
  form.addEventListener("input", save);
  form.addEventListener("change", save);
  if (!restore()) {
    const today = new Date().toISOString().slice(0, 10);
    form.date.value = today; form.month.value = today.slice(0, 7); form.driverSignDate.value = today;
  }

  // ---- Helpers ----
  const msg = (t, ok) => { const m = $("#msg"); m.textContent = t; m.className = ok ? "ok" : t ? "err" : ""; if (t) m.scrollIntoView({ block: "nearest" }); };

  function validate() {
    document.querySelectorAll(".invalid").forEach(e => e.classList.remove("invalid"));
    const bad = [];
    form.querySelectorAll("[required]").forEach(el => { if (!el.value.trim()) { el.classList.add("invalid"); bad.push(el); } });
    items.forEach(it => {
      if (!form.querySelector(`input[name="${it.id}"]:checked`)) {
        const el = form.querySelector(`input[name="${it.id}"]`).closest(".item");
        el.classList.add("invalid"); bad.push(el);
      }
    });
    if (!signed) { cv.classList.add("invalid"); bad.push(cv); }
    if (bad.length) {
      msg(`Please complete the highlighted fields (${bad.length} missing).`);
      bad[0].scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    msg(""); return true;
  }

  function flat() {
    const d = collect();
    const o = {
      Month: d.month, Date: d.date, "Vehicle Plate": d.plate, Model: d.model, "Assigned Driver": d.driver,
      "Current Mileage": d.mileage, "Next Change Oil": d.nextOil
    };
    for (let i = 0; i < d._maintCount; i++) {
      if (MAINT_COLS.some(([k]) => d[`m${i}_${k}`])) MAINT_COLS.forEach(([k, l]) => { o[`Maint ${i + 1} ${l}`] = d[`m${i}_${k}`] || ""; });
    }
    items.forEach(it => {
      o[`${it.section} - ${it.label}`] = d[it.id] || "";
      if (it.tyre) { o[`${it.section} - ${it.label} PSI`] = d[it.id + "__psi"] || ""; o[`${it.section} - ${it.label} Thickness %`] = d[it.id + "__thick"] || ""; }
      o[`${it.section} - ${it.label} Remarks`] = d[it.id + "__rem"] || "";
    });
    o["100% Good Condition"] = d.allGood ? "Yes" : "No";
    o["Overall Remarks"] = d.overallRemarks || "";
    o["Damages / Scratches"] = d.damages || "";
    o["Incident Report Form"] = d.incidentForm ? "Yes" : "No";
    o["Driver Name (sign-off)"] = d.driverSign; o["Sign-off Date"] = d.driverSignDate;
    o["Submitted At"] = new Date().toISOString();
    return { flat: o, signature: d._signature };
  }

  const csvEsc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  function downloadCSV() {
    if (!validate()) return;
    const { flat: o } = flat();
    const csv = "﻿" + Object.keys(o).map(csvEsc).join(",") + "\r\n" + Object.values(o).map(csvEsc).join(",") + "\r\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `Vehicle-Report_${(form.plate.value || "plate").replace(/\W+/g, "")}_${form.month.value}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    msg("CSV downloaded.", true);
  }

  async function submit() {
    if (!validate()) return;
    if (!C.SUBMIT_URL) { msg("Online submission is not set up yet. Use Download CSV, Print / Save PDF or Email report, and send it to your supervisor."); return; }
    const btn = $("#submit"); btn.disabled = true; btn.textContent = "Sending…";
    try {
      const { flat: o, signature } = flat();
      await fetch(C.SUBMIT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...o, Signature: signature }) });
      msg("Report submitted. Thank you!", true);
    } catch (e) { msg("Could not send (check your internet). Your entries are still saved on this device — try again."); }
    btn.disabled = false; btn.textContent = "Submit report";
  }

  function emailReport() {
    if (!validate()) return;
    const { flat: o } = flat();
    const fair = items.filter(i => form.querySelector(`input[name="${i.id}"]:checked`)?.value === "Fair").map(i => i.label);
    const body = [
      `Plate: ${o["Vehicle Plate"]}  Model: ${o.Model}`, `Driver: ${o["Assigned Driver"]}`, `Month: ${o.Month}  Date: ${o.Date}`,
      `Mileage: ${o["Current Mileage"]} km  Next oil change: ${o["Next Change Oil"] || "-"} km`,
      `Items marked FAIR: ${fair.length ? fair.join(", ") : "none"}`, `Damages: ${o["Damages / Scratches"] || "none"}`,
      "", "(Please attach the PDF or CSV of the full report.)"].join("\n");
    location.href = `mailto:${C.SUPERVISOR_EMAIL || ""}?subject=${encodeURIComponent(`Vehicle Report ${o["Vehicle Plate"]} - ${o.Month}`)}&body=${encodeURIComponent(body)}`;
  }

  $("#submit").onclick = submit;
  $("#email").onclick = emailReport;
  $("#print").onclick = () => { if (validate()) window.print(); };
  $("#reset").onclick = () => {
    if (!confirm("Start a new report? This clears everything on this form.")) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  };
})();
