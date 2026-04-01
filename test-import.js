
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function headerMap(headers, values) {
  const row = {};
  headers.forEach((header, index) => {
    row[header.toLowerCase()] = values[index] || "";
  });
  return row;
}

const csvData = `name,salePrice,sku,barcode,costPrice,initialStock
"iPhone 15",999,IP15-001,5901234567890,549,50
"Samsung Galaxy S24, 256GB",899,S24-256,5901234567891,450,30
"Pixel 8 ""Pro""",1099,P8P-001,5901234567892,600,20
"Empty Price Product",,EP-001,,100,10
"0 Price Product",0,ZP-001,,50,5
`;

const lines = csvData.split("\n").filter(line => line.trim());
const headers = parseCSVLine(lines[0]);

console.log("Headers:", headers);

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  const row = headerMap(headers, values);
  console.log(`Row ${i+1}:`, JSON.stringify(row));
  
  if (!row.name || !row.salePrice) {
    console.log(`  -> SKIPPED because !row.name (${!!row.name}) || !row.salePrice (${!!row.salePrice})`);
  }
}
