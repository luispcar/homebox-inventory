const csvInput = document.getElementById("csvInput");
const preview = document.getElementById("preview");
const generateBtn = document.getElementById("generateBtn");

let groupedItems = new Map();

csvInput.addEventListener("change", handleFileSelection);
generateBtn.addEventListener("click", () => {
  if (!groupedItems.size) {
    alert("Primero carga un archivo CSV válido.");
    return;
  }
  window.print();
});

function handleFileSelection(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const csvText = e.target.result.replace(/^\ufeff/, "");
      const items = parseCsv(csvText);
      groupedItems = groupByLocation(items);
      renderPreview(groupedItems);
      generateBtn.disabled = !groupedItems.size;
    } catch (err) {
      console.error(err);
      showMessage("No se pudo leer el CSV. Verifica el formato y vuelve a intentarlo.");
      generateBtn.disabled = true;
    }
  };
  reader.readAsText(file);
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = parseLine(lines.shift());
  const idxLocation = headers.indexOf("HB.location");
  const idxName = headers.indexOf("HB.name");
  const idxQty = headers.indexOf("HB.quantity");

  if (idxLocation === -1 || idxName === -1 || idxQty === -1) {
    throw new Error("Faltan columnas obligatorias en el CSV");
  }

  const items = [];
  for (const line of lines) {
    const cells = parseLine(line);
    const name = (cells[idxName] || "").trim();
    if (!name) continue;

    const location = (cells[idxLocation] || "Sin ubicación").trim() || "Sin ubicación";
    const quantity = normalizeQuantity(cells[idxQty]);

    items.push({ location, name, quantity });
  }

  return items;
}

function parseLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1; // Saltar la segunda comilla
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function normalizeQuantity(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return 1;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function groupByLocation(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.location)) {
      map.set(item.location, []);
    }
    map.get(item.location).push(item);
  }
  return map;
}

function renderPreview(grouped) {
  preview.innerHTML = "";

  if (!grouped.size) {
    showMessage("No hay elementos para mostrar.");
    return;
  }

  const locations = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  for (const location of locations) {
    const section = document.createElement("section");
    section.className = "location-section";

    const title = document.createElement("h2");
    title.className = "location-title";
    title.textContent = location;
    section.appendChild(title);

    const list = document.createElement("ul");
    list.className = "item-list";

    const items = grouped.get(location).slice().sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      const li = document.createElement("li");

      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = item.name;

      const qty = document.createElement("span");
      qty.className = "item-qty";
      qty.textContent = `x${item.quantity}`;

      li.appendChild(name);
      li.appendChild(qty);
      list.appendChild(li);
    }

    section.appendChild(list);
    preview.appendChild(section);
  }
}

function showMessage(text) {
  preview.innerHTML = "";
  const p = document.createElement("p");
  p.className = "placeholder";
  p.textContent = text;
  preview.appendChild(p);
}
