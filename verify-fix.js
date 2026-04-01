// No require needed, functions are defined below

// Test data
const csvData = `Name, "Sale Price", SKU, Barcode, "Cost Price", "Initial Stock", "Low Stock Alert", Description
"iPhone 15", "$999.00", IP15-001, 5901234567890, 549, 50, 10, "Latest iPhone"
"Samsung S24", "899", S24-001, 5901234567891, 450, 30, 5, "Samsung flagship"
"Free Product", 0, FREE-001, , 0, 100, 0, "Zero price test"
"Quoted, Comma", "1,200.50", QC-001, , 800, 5, 1, "Testing commas in prices"
"Newline
Product", 500, NL-001, , 300, 10, 2, "Testing newlines in names"
`;

function test() {
  console.log("Starting Bulk Import Logic Verification...");

  const rows = parseCSV(csvData);
  console.log(`Parsed ${rows.length} rows (including header)`);

  const rawHeaders = rows[0];
  const headerMapObj = createHeaderMap(rawHeaders);
  console.log("Header Map:", headerMapObj);

  const requiredHeaders = ["name", "salePrice"];
  const missingHeaders = requiredHeaders.filter((h) => !headerMapObj[h]);

  if (missingHeaders.length > 0) {
    console.error("FAIL: Missing required headers:", missingHeaders);
    return;
  }
  console.log("PASS: Required headers found");

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const row = mapRowToColumns(headerMapObj, values);
    console.log(`\nRow ${i + 1}:`, JSON.stringify(row));

    const salePrice = cleanNumber(row.salePrice);
    const costPrice = cleanNumber(row.costPrice || "0");
    const initialStock = cleanNumber(row.initialStock);

    console.log(`  Cleaned: salePrice=${salePrice}, costPrice=${costPrice}, initialStock=${initialStock}`);

    if (!row.name) {
      console.log("  SKIPPED: Missing name");
      continue;
    }

    if (salePrice === null || isNaN(Number(salePrice))) {
      console.log(`  ERROR: Invalid sale price "${row.salePrice}"`);
    } else {
      console.log(`  VALID: Price is ${Number(salePrice)}`);
    }
    
    if (initialStock !== null) {
        console.log(`  VALID: Initial stock is ${Number(initialStock)}`);
    }
  }
}

// Mock the functions since they are in a CommonJS-unfriendly Next.js route file
// I'll just paste them here for the test script
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      if (currentRow.length > 0 || currentField !== "") {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      }
    } else {
      currentField += char;
    }
  }
  if (currentRow.length > 0 || currentField !== "") {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }
  return rows;
}

const COLUMN_MAP = {
  "name": "name",
  "saleprice": "salePrice",
  "sale price": "salePrice",
  "sku": "sku",
  "barcode": "barcode",
  "costprice": "costPrice",
  "cost price": "costPrice",
  "initialstock": "initialStock",
  "initial stock": "initialStock",
  "lowstockalert": "lowStockAlert",
  "low stock alert": "lowStockAlert",
  "description": "description",
  "unit": "unit",
  "trackstock": "trackStock",
  "track stock": "trackStock",
  "categoryid": "categoryId",
  "supplierid": "supplierId",
};

function createHeaderMap(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const cleanHeader = header.toLowerCase().trim();
    if (COLUMN_MAP[cleanHeader]) {
      map[COLUMN_MAP[cleanHeader]] = index;
    } else {
      map[header] = index;
    }
  });
  return map;
}

function mapRowToColumns(headerMap, values) {
  const row = {};
  Object.entries(headerMap).forEach(([columnName, index]) => {
    row[columnName] = values[index] || "";
  });
  return row;
}

function cleanNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  const cleaned = val.toString().replace(/[^0-9.-]/g, "");
  return cleaned === "" ? null : cleaned;
}

test();
